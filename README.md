# How to Use playwright-mcp?

[![npm version](https://img.shields.io/npm/v/playwright-mcp)](https://www.npmjs.com/package/playwright-mcp) [![Docs](https://img.shields.io/badge/docs-playwright--mcp-blue)](https://ashish-bansal.github.io/playwright-mcp/)

## Introduction

playwright-mcp (Model Context Protocol) is a powerful tool that bridges the gap between AI assistants and browser automation. It enables AI models to interact with web browsers, inspect DOM elements, record user interactions, and generate Playwright test scripts with higher accuracy. This guide will walk you through setting up and using playwright-mcp effectively.

## Tools

Available tools in the browser interface:

### Browser Toolbox

1. Pick DOM (🎯): Click to select and capture HTML elements from the page. Use this to record selectors for your test cases.
2. Pick Image (📸): Capture screenshots of specific elements. Useful for visual testing or documentation.
3. Record Interactions (📋): Record browser interactions such as clicks, inputs, and navigations. These interactions automatically generate selectors and can be passed as context to MCP clients like Claude or Cursor to help write test cases.

### MCP Commands

1. `init-browser`: Initialise the playwright browser.
2. `get-context`: Get the website context, which would be used to write the test case
3. `execute-code`: Execute custom Playwright JS code against the current page
4. `get-screenshot`: Get a screenshot of the current page
5. `get-full-dom`: Get the full DOM of the current page. (Prefer using `get-context` instead)

## Learn More

Want to dive deeper? Check out the full documentation:

[📖 **View Documentation**](https://ashish-bansal.github.io/playwright-mcp/)
