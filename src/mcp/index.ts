import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { chromium, BrowserContext, Browser, Page } from "playwright";
import { injectToolbox } from "./toolbox.js";
import { secureEvalAsync } from "./eval.js";
import { initState, getState, updateState, type Message } from "./state.js";
import { initRecording } from "./recording";
import { handleBrowserEvent } from "./handle-browser-event.js";

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
      viewport: null,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      bypassCSP: true,
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
    await initRecording(page, handleBrowserEvent(page));

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
  "Get the full DOM of the current page. (Deprecated, use get-context instead)",
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
  "Get the website context which would be used to write the testcase",
  {},
  async () => {
    const state = getState();

    if (state.messages.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No messages available`
          }
        ]
      };
    }

    const content: any = [];

    let totalLength = 0;
    let messagesProcessed = 0;

    while (messagesProcessed < state.messages.length && totalLength < 20000) {
      const message = state.messages[messagesProcessed];
      let currentContent = message.content
      if (message.type === 'DOM') {
        currentContent = `DOM: ${message.content}`;
      } else if (message.type === 'Text') {
        currentContent = `Text: ${message.content}`;
      } else if (message.type === 'Interaction') {
        const interaction = JSON.parse(message.content);
        delete interaction.eventId;
        delete interaction.dom;
        delete interaction.elementUUID;
        if (interaction.selectors) {
          interaction.selectors = interaction.selectors.slice(0, 10);
        }

        currentContent = JSON.stringify(interaction);
      } else if (message.type === 'Image') {
        currentContent = message.content;
      }

      totalLength += currentContent.length;

      const item: any = {}
      const isImage = message.type === 'Image';
      if (isImage) {
        item.type = "image";
        item.data = message.content;
        item.mimeType = "image/png";
      } else {
        item.type = "text";
        item.text = currentContent;
      }
      content.push(item);
      messagesProcessed++;
    }

    // Remove processed messages
    state.messages.splice(0, messagesProcessed);
    updateState(page, state);

    const remainingCount = state.messages.length;
    if (remainingCount > 0) {
      content.push({
        type: "text",
        text: `Remaining ${remainingCount} messages, please fetch those in next requests.\n`
      });
    }

    return {
      content
    };
  }
);

server.tool(
  "validate-selectors",
  "Validate multiple selectors. Returns validation results for each selector.  (Deprecated, use execute-code instead)",
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
