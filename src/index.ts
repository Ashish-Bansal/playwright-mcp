#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, BrowserContext, Browser, Page } from "playwright";
import { parseDom } from "./utils.js";
import { injectToolbox } from "./toolbox.js";

let browser: Browser;
let context: BrowserContext;
let page: Page;
let messages: string[] = [];

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
      messages.push(message);
    });

    // Expose the function to clear picked elements
    await page.exposeFunction('clearPickedElements', () => {
      messages = [];
    });

    // Get current messages
    await page.exposeFunction('getMessages', () => {
      return messages;
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
  "get-dom",
  "Get the DOM of the required element",
  {},
  async ({ }) => {
    const messagesToSend = [...messages]; // Create a copy
    messages = []; // Clear the list

    return {
      content: [
        {
          type: "text",
          text: messagesToSend.join('\n---\n') || 'No messages',
        },
      ],
    };
  }
)

server.tool(
  "get-url",
  "Get the URL of a page",
  {},
  async ({ }) => {
    const url = page.url();
    return {
      content: [
        {
          type: "text",
          text: url,
        },
      ],
    };
  }
);

server.tool(
  "get-selector-count",
  "Get the count of elements matching a selector",
  {
    selector: z.string(),
  },
  async ({ selector }) => {
    const locator = page.locator(selector);
    const count = await locator.count();
    return {
      content: [
        {
          type: "text",
          text: count.toString(),
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
