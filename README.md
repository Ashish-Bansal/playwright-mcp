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
4. Text Input (✍️): Type and send text messages to record custom notes or descriptions.

### MCP Commands

1. `get-full-dom`: Get the full DOM of the current page. (Prefer using `get-context` instead)
2. `get-screenshot`: Get a screenshot of the current page
3. `execute-code`: Execute custom Playwright JS code against the current page
4. `get-context`: Get the website context, which would be used to write the test case
5. `validate-selectors`: Validate multiple selectors. Returns validation results for each selector

## Prerequisites

- Node.js installed on your system
- Playwright and its Chromium browser installed on your system
- An IDE that supports MCP (Model Context Protocol) such as Cursor
- Good familiarity with Playwright testing framework

## Setup Instructions

### Setting Up playwright-mcp with Cursor IDE

1. Open Cursor IDE
2. Navigate to Settings (⚙️)
3. Select "Cursor settings"
4. Go to the "MCP" tab
5. Click "Add new MCP server"
6. Fill in the following details:
   - Server Name: `playwright-mcp`
   - Command to run: `npx -y playwright-mcp` (or specify version with `npx -y playwright-mcp@x.y.z`)
7. Click "Add" to confirm

Note: While playwright-mcp works with Claude and other AI assistants, it performs best when integrated directly with an IDE like Cursor/WindSurf.

## Using playwright-mcp

### Opening a Browser Session

1. Navigate to the file where you want to write or update a test case
2. Open the Cursor AI window using `Cmd + I` (macOS) or the equivalent shortcut
3. Enter the prompt: `Just open browser for me`
4. Approve running the tool when prompted
5. A new browser window will open

### Inspecting Elements and Recording Interactions

1. In the browser window, navigate to the webpage you want to test
2. Look for the toolbox that appears alongside the browser
3. To record interactions (e.g., clicks, inputs, navigation), use the "Start Recording" button. The selectors will be automatically generated and can be passed as context to MCP clients.
4. You can additionally click "+" to attach a screenshot or DOM of certain elements. (Note: Cursor doesn't support images yet through MCP)
5. Once you are done, you can stop the recording. You can modify the selector as required, delete steps, etc. That’s it.

### Generating Test Code

1. Return to your Cursor IDE
2. In the Chat Window, add a few existing test files for context and then enter a prompt like:

```
    ## DON'T ASSUME ANYTHING. Whatever you write in code, it must be found in the context. Otherwise leave comments.

    ## Goal
    Help me write playwright code with following functionalities:
    - [[add semi-high level functionality you want here]]
    - [[more]]
    - [[more]]
    - [[more]]

    ## Reference
    - Use @x, @y files if you want to take reference on how I write POM code

    ## Steps
    - First fetch the context from `get-context` tool, until it returns no elements remaining
    - Based on context and user functionality, write code in POM format, encapsulating high level functionality into reusable functions
    - Try executing code using `execute-code` tool. You could be on any page, so make sure to navigate to the correct page
    - Write spec file using those reusable functions, covering multiple scenarios
```

3. Press Enter and wait for the code generation to complete
4. Review the generated test code

## Best Practices

- **Record Key Interactions: Capture critical user flows using the "Record Interactions" feature for more accurate test cases**
- **Select Relevant Elements**: Only pick elements that are directly related to your test case
- **Iterative Refinement**: Don't expect perfect tests on the first try; refine them iteratively



For more detailed information and advanced usage, check out
[📖 **View Documentation**](https://ashish-bansal.github.io/playwright-mcp/)
