# Cursor & other MCP clients

Connect the Gibraltar Prediction Markets MCP server to Cursor — or any MCP-compatible client (Windsurf, Cline, and similar) — over the local stdio transport.

---

## Prerequisites

- **Node.js 18 or later.**
- The server built once from the repository root:

```bash
npm install && npm run build
```

This produces `dist/index.js`, the stdio entry point every client below launches. All ten tools (`search`, `fetch`, `get_regulation`, `list_regulations`, `get_part`, `get_schedule`, `get_definition`, `get_application_checklist`, `get_authorisation_conditions`, `about`) are served over stdio — no network endpoint or tunnel is required.

---

## Cursor

Cursor reads MCP servers from `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` inside a workspace. Create or edit the file and add the server.

**Recommended (after publishing to npm)** — portable, no build or path:

```json
{
  "mcpServers": {
    "gibraltar-prediction-markets": {
      "command": "npx",
      "args": ["-y", "gibraltar-prediction-markets-mcp"]
    }
  }
}
```

**Local testing (before publishing)** — absolute path to your build:

```json
{
  "mcpServers": {
    "gibraltar-prediction-markets": {
      "command": "node",
      "args": ["/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"]
    }
  }
}
```

Then:

1. Restart Cursor (or reload the window).
2. Open **Settings → MCP** and confirm `gibraltar-prediction-markets` shows as connected with its tools listed.
3. In the chat panel, ask a question about the Regulations. Cursor selects the appropriate tool automatically.

---

## Other MCP clients (Windsurf, Cline, etc.)

Any client that speaks the MCP stdio transport uses the same launch definition. The container key and file location differ by client, but the `command` / `args` pair is identical:

```json
{
  "mcpServers": {
    "gibraltar-prediction-markets": {
      "command": "node",
      "args": ["/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"]
    }
  }
}
```

- **Windsurf** — add the block under `mcpServers` in its MCP configuration, then reload.
- **Cline** — add the block under `mcpServers` in the Cline MCP settings file, then reload.
- **Any other stdio client** — supply `command: "node"` and the absolute path to `dist/index.js` as the single argument, using whatever key that client reserves for MCP servers.

Consult the individual client's documentation for the exact config-file path. The server definition does not change.

---

## Example prompts

Once connected, ask in plain English. The assistant maps each request to a tool:

- *"List the arrangement of the Prediction Market Regulations 2026."* → `list_regulations`
- *"What does regulation 12 say about approving contracts?"* → `get_regulation`
- *"Show me everything in Part 3."* → `get_part`
- *"Define 'prediction market contract'."* → `get_definition`
- *"Give me the checklist for an authorisation application."* → `get_application_checklist`
- *"What are the core authorisation conditions?"* → `get_authorisation_conditions`
- *"How does Schedule 3 modify the Gambling Act's sanctioning powers?"* → `get_schedule`
- *"Search the Regulations for anything on settlement sources."* → `search`, then `fetch`
- *"What is this server and what legislation does it cover?"* → `about`

---

## Notes

- The server runs entirely locally over stdio; no data leaves your machine to answer a query.
- Every tool response ends with a source citation and a *not legal advice — verify at [gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi)* reminder.
- If a client cannot see the tools, verify the absolute path to `dist/index.js`, confirm `npm run build` has been run, and check that `node` is on the client's `PATH`.

---

*Source: Prediction Market Regulations 2026 (LN.2026/176), subsidiary legislation under the Gambling Act 2025. © Government of Gibraltar, [www.gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi). This documentation is not legal advice; always verify against the official version at gibraltarlaws.gov.gi.*
