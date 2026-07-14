/**
 * Catch-all 404. Unmatched paths must return a real 404 — not the landing page —
 * because MCP clients probe /.well-known/oauth-* to decide whether the server is
 * OAuth-protected; a 200 there makes them attempt a sign-in flow that doesn't exist.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(404).json({ error: "Not found. MCP endpoint: POST /mcp" });
}
