#!/usr/bin/env node
/**
 * Local / always-on HTTP entry point — the transport used by ChatGPT and remote
 * MCP clients when running the server as a standalone process. Exposes POST /mcp.
 *
 * Stateless: each POST is handled independently via handleMcpRequest (shared with
 * the Vercel function), so there is no session store. GET/DELETE have no meaning
 * in stateless mode and return 405.
 */
import express, { type Request, type Response } from "express";
import { handleMcpRequest } from "./mcpHandler.js";

const PORT = Number(process.env.PORT ?? 3000);
const app = express();
app.use(express.json());

app.post("/mcp", (req: Request, res: Response) => {
  handleMcpRequest(req, res, req.body).catch((err) => {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  });
});

const methodNotAllowed = (_req: Request, res: Response) =>
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed (stateless server)." }, id: null });
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", server: "gibraltar-prediction-markets", transport: "streamable-http", stateless: true });
});

app.listen(PORT, () => {
  console.error(`Gibraltar Prediction Markets MCP (HTTP, stateless) listening on http://localhost:${PORT}/mcp`);
});
