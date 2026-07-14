/**
 * Vercel serverless entry point for the MCP server (streamable HTTP, stateless).
 * Routed from /mcp via vercel.json. Delegates to the shared handler in dist/,
 * which is built during deploy (package.json `prepare`/`build`). The legislative
 * data is bundled via `includeFiles: "data/**"` in vercel.json.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleMcpRequest } from "../dist/mcpHandler.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed (stateless server)." }, id: null });
    return;
  }
  try {
    await handleMcpRequest(req as never, res as never, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
}
