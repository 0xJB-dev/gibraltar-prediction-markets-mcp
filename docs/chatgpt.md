# ChatGPT (custom connector) setup

Connect the Gibraltar Prediction Markets MCP server to ChatGPT Developer Mode as a custom connector so you can search and cite the Prediction Market Regulations 2026 (LN.2026/176) from a chat.

## Overview

ChatGPT custom connectors speak MCP over the **streamable HTTP transport** and require a **public HTTPS endpoint**.

**The easiest path: use the hosted endpoint.** The server is deployed at:

```
https://mcp.0xjb.dev/mcp
```

Add that URL as a custom connector (Settings → Connectors → Advanced / Developer Mode → Add custom connector) and you are done — skip to "Example prompts" below. The remainder of this guide covers self-hosting the endpoint yourself.

Self-hosting: unlike Claude Desktop, Claude Code, and Cursor (which run the server locally over stdio, `dist/index.js`), for ChatGPT you run the HTTP entry point (`dist/http.js`), which exposes a single `POST /mcp` endpoint.

Within a ChatGPT connector, the server presents the two connector-contract tools:

- **`search(query, limit?)`** — returns matching records from the regulations.
- **`fetch(id)`** — returns the full content of a record by id.

The other tools this server exposes (`get_regulation`, `list_regulations`, `get_part`, `get_schedule`, `get_definition`, `get_application_checklist`, `get_authorisation_conditions`, `about`) are used by MCP clients that call tools directly, such as Claude. In ChatGPT, retrieval flows through `search` + `fetch`.

## 1. Build and run the HTTP server

Requires Node.js 18 or later.

```bash
cd "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC"
npm install && npm run build
npm run start:http
```

By default the server listens on port `3000`. Set `PORT` to override:

```bash
PORT=8080 npm run start:http
```

Verify it is up with the health check:

```bash
curl http://localhost:3000/healthz
# {"status":"ok","server":"gibraltar-prediction-markets","transport":"streamable-http"}
```

The MCP endpoint itself is:

```
http://localhost:3000/mcp
```

## 2. Expose it over public HTTPS

ChatGPT must be able to reach the endpoint over HTTPS. For local testing, a tunnel is the quickest option. Using ngrok:

```bash
ngrok http 3000
```

ngrok prints a public HTTPS forwarding URL, for example `https://abcd-1234.ngrok-free.app`. Your connector URL is that host with the `/mcp` path appended:

```
https://abcd-1234.ngrok-free.app/mcp
```

For a stable, always-on connector, deploy the server to a host you control (a VM, container, or PaaS) behind HTTPS instead of a tunnel. Run `npm run start:http`, keep the process supervised, and point the connector at `https://YOUR_HOST/mcp`.

## 3. Add the connector in ChatGPT

1. In ChatGPT, enable **Developer Mode** and open the custom connector / MCP configuration.
2. Add a new connector pointing at your MCP URL (the `…/mcp` address from step 2).
3. Save. ChatGPT will connect and discover the `search` and `fetch` tools.

## Security warning

The HTTP server ships with **no authentication**. A public `…/mcp` URL is reachable by anyone who has it.

- Do not expose the raw endpoint to the public internet without an access control layer in front of it.
- Put an authenticating reverse proxy or gateway ahead of the server (for example, a proxy enforcing a bearer token, mTLS, or IP allow-listing) before you share the URL.
- Treat tunnel URLs as temporary and tear them down when you are done testing.

The content served is public Gibraltar legislation, but an open endpoint is still an unauthenticated compute and bandwidth surface. Lock it down before deploying.

## Example prompts

Once the connector is active, retrieval runs through `search` and `fetch`:

- "Search the Prediction Market Regulations 2026 for the authorisation application requirements."
- "What are the ongoing authorisation conditions a licensee must meet? Cite the regulation numbers."
- "Find and summarise the definition of 'prediction market' in LN.2026/176."
- "What does Schedule 1 cover? Pull the full text."
- "List the regulations in Part 3 and explain what each one does."

Every tool response ends with a source citation and a reminder that the output is **not legal advice** and should be verified against the official text at [gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi).

---

**Source:** Prediction Market Regulations 2026 (LN.2026/176), subsidiary legislation under the Gambling Act 2025, commenced 13 July 2026. © Government of Gibraltar (www.gibraltarlaws.gov.gi). This documentation is not legal advice; verify against the official text at gibraltarlaws.gov.gi.
