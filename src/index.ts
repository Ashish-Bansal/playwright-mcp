import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, BrowserContext, Browser, Page } from "playwright";
import { parseDom } from "./utils.js";
import { injectToolbox } from "./toolbox.js";

let browser: Browser;
let context: BrowserContext;
let page: Page;

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
    context = await browser.newContext();
    page = await context.newPage();

    page.addInitScript(injectToolbox);
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
    const page = context.pages()[0];
    const dom = await page.evaluate(() => document.documentElement.outerHTML);
    const window = parseDom(dom);
    const element = window.document.querySelector('[data-pick]');
    const content = element ? element.outerHTML : '';
    page.evaluate(() => {
      const element = document.querySelector('[data-pick]');
      if (element) {
        element.removeAttribute('data-pick');
      }
    });

    return {
      content: [
        {
          type: "text",
          text: content,
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
    const page = context.pages()[0];
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
    const page = context.pages()[0];
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
  console.info("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main", error);
  context.close();
  browser.close();
  process.exit(1);
});
