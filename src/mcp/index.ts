import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { chromium, BrowserContext, Browser, Page } from "playwright";
import { injectToolbox } from "./toolbox.js";
import { secureEvalAsync } from "./eval.js";
import { initState, getState, updateState, type Message } from "./state.js";
import { initRecording } from "./recording";
import { preprocessBrowserEvent } from "./recording/utils.js";

let browser: Browser;
let context: BrowserContext;
let page: Page;


const server = new McpServer({
  name: "playwright",
  version: "1.0.0",
});

server.prompt(
  "server-flow",
  "Get prompt on how to use this MCP server",
  () => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Let me share the flow of how this MCP server works. We will initialise browser if we haven't done so. In the opened browser, user will navigate to page for which they want to write testcases and then record interactions with the page. This is context for writing the testcase.

Please follow this exact sequence of steps to write the testcase:
1. Use the "get-context" tool to obtain the context.
2. Use that context to write the testcase based on your prompt.
3. Once you have generated first version of the testcase, make sure you verify that all the selectors you've chosen are correct using the "validate-selectors" tool.
`
          }
        }
      ]
    };
  }
);



server.tool(
  'init-browser',
  'Initialize a browser with a URL',
  {
    url: z.string().url().describe('The URL to navigate to')
  },
  async ({ url }) => {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }

    browser = await chromium.launch({
      headless: false,
    });
    context = await browser.newContext({
      viewport: null
    });
    page = await context.newPage();

    await page.exposeFunction('triggerMcpStartPicking', (pickingType: 'DOM' | 'Image') => {
      page.evaluate((pickingType: 'DOM' | 'Image') => {
        window.mcpStartPicking(pickingType);
      }, pickingType);
    });

    await page.exposeFunction('triggerMcpStopPicking', () => {
      page.evaluate(() => {
        window.mcpStopPicking();
      });
    });

    await page.exposeFunction('onElementPicked', (message: Message) => {
      const state = getState();
      state.messages.push(message);
      state.pickingType = null;
      updateState(page, state);
    });

    await page.exposeFunction('takeScreenshot', async (selector: string) => {
      try {
        const screenshot = await page.locator(selector).screenshot({
          timeout: 5000
        });
        return screenshot.toString('base64');
      } catch (error) {
        console.error('Error taking screenshot', error);
        return null;
      }
    });

    await page.exposeFunction('executeCode', async (code: string) => {
      const result = await secureEvalAsync(page, code);
      return result;
    });

    await initState(page);
    await initRecording(page, (event: any) => {
      const state = getState();
      if (!state.recordingInteractions || state.pickingType) {
        return;
      }

      preprocessBrowserEvent(event)

      if (state.messages.length > 0) {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage.type === 'Interaction') {
          const lastInteraction = JSON.parse(lastMessage.content);
          if (lastInteraction.type === "input" && lastInteraction.elementUUID === event.elementUUID) {
            lastInteraction.typedText = event.typedText;
            state.messages[state.messages.length - 1] = {
              type: 'Interaction',
              content: JSON.stringify(lastInteraction),
            };
            updateState(page, state);
            return;
          }
        }
      }

      state.messages.push({
        type: 'Interaction',
        content: JSON.stringify(event),
      });
      updateState(page, state);
    });

    await page.addInitScript(injectToolbox);
    await page.goto(url);

    return {
      content: [
        {
          type: "text",
          text: `Browser has been initialized and navigated to ${url}`,
        },
      ],
    };
  }
)

server.tool(
  "get-full-dom",
  "Get the full DOM of the current page. (Prefer using get-context instead)",
  {},
  async () => {
    const html = await page.content();
    return {
      content: [
        {
          type: "text",
          text: html,
        },
      ],
    };
  }
);

server.tool(
  'get-screenshot',
  'Get a screenshot of the current page',
  {},
  async () => {
    const screenshot = await page.screenshot({
      type: "png",
    });
    return {
      content: [
        {
          type: "image",
          data: screenshot.toString('base64'),
          mimeType: "image/png",
        },
      ],
    };
  }
)

server.tool(
  'execute-code',
  'Execute custom Playwright JS code against the current page',
  {
    code: z.string().describe(`The Playwright code to execute. Must be an async function declaration that takes a page parameter.

Example:
async function run(page) {
  console.log(await page.title());
  return await page.title();
}

Returns an object with:
- result: The return value from your function
- logs: Array of console logs from execution
- errors: Array of any errors encountered

Example response:
{"result": "Google", "logs": ["[log] Google"], "errors": []}`)
  },
  async ({ code }) => {
    const result = await secureEvalAsync(page, code);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2) // Pretty print the JSON
        }
      ]
    };
  }
)

server.tool(
  "get-context",
  "Get the current URL and user defined context which would be used to write the testcase",
  {},
  async () => {
    const url = page.url();
    const state = getState();
    const message = state.messages[0]; // Get first element

    if (!message) {
      return {
        content: [
          {
            type: "text",
            text: `URL: ${url}\n\nNo messages available`
          }
        ]
      };
    }

    // Remove first message from array
    state.messages.shift();
    updateState(page, state);

    const remainingCount = state.messages.length;
    let textContent = `URL: ${url}\n\n`;
    if (remainingCount > 0) {
      textContent += `Remaining ${remainingCount} messages, please fetch those one by one.\n\n`;
    }

    if (message.type === 'DOM') {
      textContent += `DOM: ${message.content}`;
    } else if (message.type === 'Text') {
      textContent += `Text: ${message.content}`;
    }

    const content: any = [
      {
        type: "text",
        text: textContent
      },
    ]

    if (message.type === 'Image') {
      content.push({
        type: "image",
        data: message.content,
        mimeType: "image/png"
      })
    }

    return {
      content
    };
  }
);

server.tool(
  "validate-selectors",
  "Validate multiple selectors. Returns validation results for each selector",
  {
    selectors: z.array(z.string()),
  },
  async ({ selectors }) => {
    const results = await Promise.all(
      selectors.map(async (selector) => {
        const locator = page.locator(selector);
        const count = await locator.count();
        return {
          selector,
          isValid: count === 1,
          count
        };
      })
    );

    const validationText = results
      .map(({ selector, isValid, count }) =>
        `${selector}: ${isValid ? 'valid' : `invalid (${count} elements found)`}`
      )
      .join('\n');

    return {
      content: [
        {
          type: "text",
          text: validationText
        },
      ],
    };
  }
);

export { server }
