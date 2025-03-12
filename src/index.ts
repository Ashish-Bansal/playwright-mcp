#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, BrowserContext, Browser, Page } from "playwright";
import { injectToolbox } from "./toolbox.js";

type MessageType = 'DOM' | 'Text' | 'Image';

interface Message {
  type: MessageType;
  content: string;
}

let browser: Browser;
let context: BrowserContext;
let page: Page;
let messages: Message[] = [];

const server = new McpServer({
  name: "playwright",
  version: "1.0.0",
});

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

    // Expose the function to handle picked elements
    await page.exposeFunction('onElementPicked', (message: string) => {
      messages.push({ type: 'DOM', content: message });
    });

    await page.exposeFunction('deleteMessage', (message: string) => {
      messages = messages.filter(m => m.content !== message);
    });

    // Expose the function to clear picked elements
    await page.exposeFunction('clearPickedElements', () => {
      messages = [];
    });

    // Get current messages
    await page.exposeFunction('getMessages', () => {
      return messages;
    });

    await page.exposeFunction('takeScreenshot', async (selector: string) => {
      try {
        const screenshot = await page.locator(selector).screenshot({
          timeout: 5000
        });
        const base64Screenshot = screenshot.toString('base64');
        messages.push({ type: 'Image', content: base64Screenshot });
        return base64Screenshot;
      } catch (error) {
        console.error('Error taking screenshot', error);
        return null;
      }
    });

    await page.addInitScript(injectToolbox);
    await page.goto(url);

    return {
      content: [
        {
          type: "text",
          text: `Browser has been initialized and navigated to ${url}.
          Let me share the flow of how this MCP server works. In the opened browser, user will nagivate to page for which they want to write testcases and then record
          DOM and images for certain elements. This is context for writing the testcase.

          Please follow this exact sequence of steps to write the testcase:
          1. Use the "get-context" tool to obtain the context.
          2. Use that context to write the testcase based on your prompt.
          3. Once you have generated first version of the testcase, make sure you verify that all the selectors you've chosen are correct using the "validate-selectors" tool.

          Here are the priorities for the attributes that you should use to write the testcase:

          const ATTR_PRIORITIES = {
            'id': 1,
            'data-testid': 2,
            'data-test-id': 2,
            'data-pw': 2,
            'data-cy': 2,
            'data-id': 2,
            'data-name': 3,
            name: 3,
            'aria-label': 3,
            title: 3,
            placeholder: 4,
            href: 4,
            alt: 4,
            'data-index': 5,
            'data-role': 5,
            role: 5,
          }`,
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
  "get-context",
  "Get the current URL and user defined context which would be used to write the testcase",
  {},
  async () => {
    const url = page.url();
    const message = messages[0]; // Get first element

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
    messages.shift();

    const remainingCount = messages.length;
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
      .map(({selector, isValid, count}) =>
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error in main", error);
  context.close();
  browser.close();
  process.exit(1);
});
