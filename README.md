# Gibraltar Prediction Markets — MCP Server

Query the **Prediction Market Regulations 2026 (LN.2026/176)** in plain English from Claude Desktop, Claude Code, ChatGPT, Cursor, or any [MCP](https://modelcontextprotocol.io) client. Ask a question — *"What must an application for authorisation include?"* — and get back the exact, cited regulation text instead of a guess.

Built for lawyers and regulatory professionals who want the statute inside the tools they already use.

📄 **Official text:** [Prediction Market Regulations 2026 (LN.2026/176) — gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi/uploads/legislations/gambling/2026s176/2026s176.pdf)

> ⚖️ **Not legal advice.** This server reproduces Gibraltar legislation for research and reference only. It is **not legal advice** and **not an official version of the law**. Always verify against the [official text](https://www.gibraltarlaws.gov.gi/uploads/legislations/gambling/2026s176/2026s176.pdf) and consult qualified Gibraltar counsel before relying on it.

---

## Connect your client

| Client | Guide |
|--------|-------|
| **Claude Desktop** | [docs/claude-desktop.md](docs/claude-desktop.md) |
| **Claude Code (CLI)** | [docs/claude-code.md](docs/claude-code.md) |
| **ChatGPT** (custom connector) | [docs/chatgpt.md](docs/chatgpt.md) |
| **Cursor** & other MCP clients | [docs/cursor.md](docs/cursor.md) |
| **Claude API / Agent SDK** | [docs/api-sdk.md](docs/api-sdk.md) |
| The law & data model | [docs/concepts.md](docs/concepts.md) |

## Quick start

### Hosted (easiest — nothing to install)

The server runs at **`https://mcp.0xjb.dev/mcp`**. Point any HTTP-capable MCP client at it:

```bash
# Claude Code CLI
claude mcp add --transport http gibraltar-pm https://mcp.0xjb.dev/mcp
```

For Claude Desktop, Cursor, or ChatGPT, add a remote/HTTP connector with the same URL. Works for anyone — no Node, no terminal required.

### Local via npm (stdio)

Every client can also run the [npm package](https://www.npmjs.com/package/gibraltar-prediction-markets-mcp) locally — no build, no paths:

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

```bash
# Claude Code CLI
claude mcp add gibraltar-prediction-markets -- npx -y gibraltar-prediction-markets-mcp
```

For local testing before publishing, see [PUBLISHING.md](PUBLISHING.md) and the per-client guides (`node dist/index.js` over stdio, or `npm run start:http` for ChatGPT/remote).

## What you can ask

- *"List the arrangement of the Prediction Market Regulations 2026."*
- *"What does regulation 12 say about approving contracts?"*
- *"Give me the checklist for an authorisation application."*
- *"Define 'prediction market contract'."*
- *"Which contracts can the Authority prohibit under regulation 14?"*
- *"Can operators accept stablecoins?"* (regulation 22)

## Tools

Ten tools; `search` + `fetch` also satisfy ChatGPT's connector contract.

| Tool | Purpose |
|------|---------|
| `search(query, limit?)` | Ranked keyword search; returns ids for `fetch`. |
| `fetch(id)` | Full verbatim text by id (`reg-12`, `schedule-2`, `definitions`). |
| `get_regulation(number)` | A regulation, 1–34, with its Part. |
| `list_regulations()` | The full arrangement of provisions. |
| `get_part(number)` | Every regulation in a Part, 1–7. |
| `get_schedule(number)` | A Schedule, 1–3. |
| `get_definition(term?)` | A defined term (reg 3); omit to list all. |
| `get_application_checklist()` | Schedule 1 — application requirements. |
| `get_authorisation_conditions()` | Schedule 2 — core conditions. |
| `about()` | Metadata, source and status of this server. |

Every response carries its **source citation** and a not-legal-advice reminder.

## Data model

One authoritative file, [`data/regulations.json`](data/regulations.json), holds the verbatim text. Each unit is an addressable document with a stable id — `reg-1`…`reg-34`, `schedule-1`…`schedule-3`, and `definitions` (the 14 defined terms of reg 3). This single shape serves every tool. Full walkthrough in [docs/concepts.md](docs/concepts.md).

## Source

- **Law:** Prediction Market Regulations 2026, **LN.2026/176** — subsidiary legislation under the **Gambling Act 2025** (ss. 34 and 159). Commencement **13 July 2026**.
- **Official text:** [2026s176.pdf](https://www.gibraltarlaws.gov.gi/uploads/legislations/gambling/2026s176/2026s176.pdf) · © Government of Gibraltar, [gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi).

## License

MIT for the server code. The legislative text is © Government of Gibraltar, reproduced for reference.
