# Claude API / Agent SDK & programmatic use

How to connect the Gibraltar Prediction Markets MCP server from your own code — either remotely over HTTP via the Anthropic API MCP connector / Claude Agent SDK, or locally over stdio with a direct MCP client.

There are two ways to reach the server programmatically. Pick by transport:

| You want | Transport | Approach |
|----------|-----------|----------|
| Claude (via the Anthropic API or Agent SDK) to call the tools during a run | **HTTP** | MCP connector pointing at your public `/mcp` URL |
| Your own process to invoke tools directly, no model in the loop | **stdio** | An MCP client that spawns `node dist/index.js` |

Both expose the same 10 tools: `search`, `fetch`, `get_regulation`, `list_regulations`, `get_part`, `get_schedule`, `get_definition`, `get_application_checklist`, `get_authorisation_conditions`, and `about`. Every response carries a source citation and a not-legal-advice reminder.

Build once before either path:

```bash
cd "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC"
npm install && npm run build
```

---

## 1. Anthropic API MCP connector / Claude Agent SDK (HTTP)

The Anthropic API and the Claude Agent SDK can attach a **remote MCP server** to a request so the model calls the tools itself. This uses the streamable HTTP transport (`dist/http.js`, endpoint `POST /mcp`).

**Requirement:** the MCP connector reaches the server over the network, so it needs a **public HTTPS URL**. `localhost` will not work. Expose the local server with a tunnel (for example ngrok) or deploy it, then use that host's `/mcp` endpoint. The server tracks sessions by the `mcp-session-id` header, and it ships with no authentication — put an auth proxy in front before exposing it publicly, and pass any credentials your proxy expects as connector headers.

Run the HTTP entry point:

```bash
npm run start:http
# listens on POST http://localhost:3000/mcp  (PORT overridable)
# health check: GET http://localhost:3000/healthz
```

Then tunnel or deploy so it is reachable at, e.g., `https://YOUR_HOST/mcp`.

### Shape of the request

Attach the server to a Messages request as a URL-type MCP server. Conceptually:

```jsonc
{
  "model": "claude-...",
  "max_tokens": 1024,
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://YOUR_HOST/mcp",
      "name": "gibraltar-prediction-markets"
    }
  ],
  "messages": [
    { "role": "user", "content": "What must an application for authorisation include?" }
  ]
}
```

The model discovers the tools from the connector, calls (for example) `get_application_checklist` or `search` + `fetch`, and grounds its answer in the returned regulation text.

For the exact field names, headers, and beta flags currently required by the MCP connector, and for the equivalent Agent SDK configuration, follow the official documentation rather than hard-coding values here:

- Anthropic API — MCP connector: <https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector>
- Claude Agent SDK — MCP servers: <https://docs.anthropic.com/en/docs/agents-and-tools/agent-sdk>
- Model Context Protocol: <https://modelcontextprotocol.io>

---

## 2. Direct MCP client over stdio

To call the tools from your own process without a model, connect an MCP client to the stdio entry point (`dist/index.js`). Your client launches the server as a subprocess and speaks MCP over its stdin/stdout — the same mechanism Claude Desktop and Claude Code use.

The reference client is the official MCP SDK (`@modelcontextprotocol/sdk`), which the server already depends on. The pattern:

1. Create a **stdio transport** that runs `node` with the argument `"/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"`.
2. Connect an MCP `Client` over that transport.
3. Call `listTools()` to enumerate the 10 tools, then `callTool({ name, arguments })`.

Sketch (TypeScript, using the MCP SDK client — check the SDK docs for the current import paths):

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"],
});

const client = new Client({ name: "my-app", version: "1.0.0" });
await client.connect(transport);

const result = await client.callTool({
  name: "get_regulation",
  arguments: { number: 12 },
});
console.log(result.content);
```

Tool arguments follow the schemas in the tool list: `search({ query, limit? })`, `fetch({ id })` (ids like `reg-12`, `schedule-2`, `definitions`), `get_regulation({ number })` (1–34), `get_part({ number })` (1–7), `get_schedule({ number })` (1–3), `get_definition({ term? })`, and the no-argument tools `list_regulations()`, `get_application_checklist()`, `get_authorisation_conditions()`, and `about()`.

For the current client API surface, see the MCP SDK documentation at <https://modelcontextprotocol.io> and the package `@modelcontextprotocol/sdk`.

---

## Choosing between them

- Use the **HTTP MCP connector** (path 1) when you want Claude to decide which tools to call inside an API or Agent SDK run. It needs a public HTTPS endpoint.
- Use the **stdio client** (path 2) when your own code drives the calls, everything stays local, and no public endpoint is required.

---

## Source & disclaimer

Data source: **Prediction Market Regulations 2026 (LN.2026/176)**, subsidiary legislation under the Gambling Act 2025, © Government of Gibraltar. Every tool response cites its source and reminds you that the output is **not legal advice** — always verify against the authoritative text at <https://www.gibraltarlaws.gov.gi>.
