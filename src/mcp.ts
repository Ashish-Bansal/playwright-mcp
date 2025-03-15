#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./node/index";

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server started");
  }

main().catch((error) => {
    console.error("Fatal error in main", error);
    process.exit(1);
});
