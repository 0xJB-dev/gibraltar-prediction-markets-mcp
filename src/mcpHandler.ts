/**
 * Stateless MCP request handler, shared by the local HTTP server (src/http.ts)
 * and the Vercel serverless function (api/mcp.ts).
 *
 * Stateless design: a fresh McpServer + transport is created per request with
 * `sessionIdGenerator: undefined` and `enableJsonResponse: true`, so each POST
 * returns a single JSON body and nothing is retained between requests. This is
 * what makes the same code run on a serverless platform where every invocation
 * is isolated.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer } from "./server.js";

/**
 * Optional bearer-token gate. If MCP_API_KEY is set in the environment, every
 * request must present `Authorization: Bearer <key>`; otherwise the endpoint is
 * open — appropriate for public legislation. Auth can therefore be switched on
 * later by setting one env var, with no code change or redeploy of logic.
 */
function isAuthorized(req: IncomingMessage): boolean {
  const key = process.env.MCP_API_KEY;
  if (!key) return true;
  return req.headers["authorization"] === `Bearer ${key}`;
}

function jsonError(res: ServerResponse, status: number, code: number, message: string): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown
): Promise<void> {
  if (!isAuthorized(req)) {
    jsonError(res, 401, -32001, "Unauthorized");
    return;
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  // Tear down per-request resources once the response is done.
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  // Express and Vercel both pass Node-compatible req/res objects.
  await transport.handleRequest(req as never, res as never, body);
}
