# How to Use playwright-mcp?

## Introduction
playwright-mcp (Model Control Protocol) is a powerful tool that bridges the gap between AI assistants and browser automation. It enables AI models to interact with web browsers, inspect DOM elements, and generate Playwright test scripts with higher accuracy. This guide will walk you through setting up and using playwright-mcp effectively.

## Tools
Available tools in the browser interface:

### Browser Toolbox
1. Pick DOM (🎯): Click to select and capture HTML elements from the page. Use this to record selectors for your test cases.
2. Pick Image (📸): Capture screenshots of specific elements. Useful for visual testing or documentation.
3. Text Input (✍️): Type and send text messages to record custom notes or descriptions.

### MCP Commands
1. `init-browser`: Initialize a browser session and navigate to a URL
2. `get-context`: Get the current URL and recorded elements/screenshots (Recommended)
3. `get-full-dom`: Retrieve the complete HTML structure of the current page
4. `get-screenshot`: Capture a full screenshot of the entire webpage
5. `validate-selectors`: Verify that your selectors are unique and valid on the page

## Prerequisites
- Node.js installed on your system
- Playwright and its Chromium browser installed on your system
- An IDE that supports MCP (Model Control Protocol) such as Cursor
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

### Inspecting Elements
1. In the browser window, navigate to the webpage you want to test
2. Look for the toolbox that appears alongside the browser
3. Click on the "Pick DOM" / "Pick Image" button (Note: Cursor doesn't support images yet through MCP)
4. Select elements relevant to your test case by clicking on them in the browser, to capture context like element selectors/image layout

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

    ## Steps
    - First fetch the context from `get-context` tool, until it returns no elements remaining.
    - Write required code in the POM format
    - Validate all the selectors using `validate-selectors` tool.

    ## Notes
    Here are the priorities for the attributes that you should use to write the testcase:
    const ATTR_PRIORITIES = {
      'id': 1,
      'data-testid': 2,
      'data-test-id': 2,
      'data-pw': 2,
      'data-cy': 2,
      'data-id': 2,
      'data-name': 3,
      'name': 3,
      'aria-label': 3,
      'title': 3,
      'placeholder': 4,
      'href': 4,
      'alt': 4,
      'data-index': 5,
      'data-role': 5,
      'role': 5,
    }
```
3. Press Enter and wait for the code generation to complete
4. Review the generated test code

## Best Practices
- **Select Relevant Elements**: Only pick elements that are directly related to your test case
- **Step-by-Step Debugging**: Use debug mode to ensure each step of your test works correctly
- **Iterative Refinement**: Don't expect perfect tests on the first try; refine them iteratively
