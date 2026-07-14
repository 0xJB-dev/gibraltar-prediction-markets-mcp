#!/usr/bin/env node
/**
 * stdio entry point — the transport used by Claude Desktop, Claude Code (CLI),
 * Cursor and most local MCP clients. The client launches this process and speaks
 * MCP over stdin/stdout, so nothing may be written to stdout except protocol
 * traffic; diagnostics go to stderr.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gibraltar Prediction Markets MCP server running on stdio.");
}

main().catch((err) => {
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
