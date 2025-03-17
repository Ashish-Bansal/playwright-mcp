#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./mcp/index";
import { webServer } from "./web-server";

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server started");

    if (process.env.NODE_ENV !== 'development') {
      webServer.listen(5174, () => {
        console.error("Web server started");
      });
    }
}

main().catch((error) => {
    console.error("Fatal error in main", error);
    process.exit(1);
});
