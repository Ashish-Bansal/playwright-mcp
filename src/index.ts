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
      const screenshot = await page.locator(selector).screenshot({
        path: 'screenshot.png',
        timeout: 5000
      });
      const base64Screenshot = screenshot.toString('base64');
      messages.push({ type: 'Image', content: base64Screenshot });
      return base64Screenshot;
    });

    await page.addInitScript(injectToolbox);
    await page.goto(url);

    return {
      content: [
        {
          type: "text",
          text: `Browser initialized and navigated to ${url}`,
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
  "Get the current URL and top N messages",
  {
    count: z.number().optional().describe('Number of messages to return')
  },
  async ({ count = 5 }) => {
    const url = page.url();
    const messagesToReturn = messages.slice(-count);

    return {
      content: [
        {
          type: "text",
          text: `URL: ${url}\n\nMessages:\n${messagesToReturn.map(m => `[${m.type}] ${m.content}`).join('\n---\n') || 'No messages'}`
        }
      ]
    };
  }
);

server.tool(
  "validate-selector",
  "Validate a selector. Returns true if the selector is valid, false with an error message otherwise",
  {
    selector: z.string(),
  },
  async ({ selector }) => {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count === 1) {
      return {
        content: [
          {
            type: "text",
            text: "true",
          },
        ],
      };
    }

    return {
        content: [
          {
            type: "text",
          text: `false\n\n${count.toString()} elements found`,
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
