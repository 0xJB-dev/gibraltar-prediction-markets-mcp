# Claude Code (CLI) setup

Connect the Gibraltar Prediction Markets MCP server to Claude Code so you can query the **Prediction Market Regulations 2026 (LN.2026/176)** directly from the terminal.

---

## Prerequisites

- **Node.js 18 or later** installed.
- **Claude Code** installed and authenticated.
- The server built locally. From the repository root:

```bash
cd "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC"
npm install && npm run build
```

This produces `dist/index.js`, the stdio entry point Claude Code will launch.

---

## Add the server

Claude Code runs the server as a local subprocess over stdio. Register it with `claude mcp add`. Everything after the `--` is the command Claude Code executes to start the server.

### Recommended (after the package is published to npm)

Once the package is published, no local build or path is needed — `npx` fetches and runs it:

```bash
claude mcp add gibraltar-prediction-markets -- npx -y gibraltar-prediction-markets-mcp
```

This is the portable command to give any user on any machine.

### Local testing (before publishing)

While testing the unpublished package, point Claude Code at your built entry point. Either use the absolute path:

```bash
claude mcp add gibraltar-prediction-markets -- node "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"
```

…or link the package globally once (`npm link` from the repo root) and then use the published-style command, which resolves to your local checkout:

```bash
cd "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC" && npm link
claude mcp add gibraltar-prediction-markets -- gibraltar-prediction-markets-mcp
```

`npm link` lets you rehearse the exact post-publish `npx` experience locally.

---

## Verify the connection

List the registered servers and confirm the connection status:

```bash
claude mcp list
```

You should see `gibraltar-prediction-markets` listed. To inspect a single server, including its command and scope:

```bash
claude mcp get gibraltar-prediction-markets
```

Once connected, the server exposes ten tools: `search`, `fetch`, `get_regulation`, `list_regulations`, `get_part`, `get_schedule`, `get_definition`, `get_application_checklist`, `get_authorisation_conditions`, and `about`.

---

## Project vs. user scope

`claude mcp add` accepts a `--scope` flag that controls where the server is registered and who can use it.

| Scope | Flag | Stored in | Use when |
|-------|------|-----------|----------|
| **Local** (default) | `--scope local` | Your private project settings | Personal use in a single project. |
| **Project** | `--scope project` | `.mcp.json` at the project root (committed to source control) | Sharing the server with everyone working in the repository. |
| **User** | `--scope user` | Your user-level settings | Making the server available across all of your projects. |

For example, to make the server available in every project you work on (published):

```bash
claude mcp add gibraltar-prediction-markets --scope user -- npx -y gibraltar-prediction-markets-mcp
```

To share the server with your team through the repository (published):

```bash
claude mcp add gibraltar-prediction-markets --scope project -- npx -y gibraltar-prediction-markets-mcp
```

(During local testing, substitute the `node "…/dist/index.js"` command shown above.)

---

## Project-scoped sharing with `.mcp.json`

Project scope writes a `.mcp.json` file at the repository root. Commit this file so collaborators pick up the server automatically. You can also create or edit it by hand:

Published (portable — recommended for a committed `.mcp.json`):

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

Local testing (before publish — machine-specific path):

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

When a project-scoped server is present, Claude Code asks each user to approve it the first time they use the project.

> **Note:** The `npx` form is portable and works for anyone who clones the repo. The absolute-path form is specific to this machine — collaborators cloning elsewhere would need to adjust it. Prefer `npx` once published.

---

## Example prompts

With the server connected, ask questions in plain English inside a Claude Code session:

- "Search the regulations for the record-keeping requirements."
- "Get regulation 12 and summarise the obligation."
- "List all 34 regulations."
- "Show me Part 3 in full."
- "What does the application for authorisation have to include? Use the application checklist."
- "What are the conditions of authorisation?"
- "How is 'settlement source' defined in the regulations?"
- "Show me Schedule 1."
- "What is this server and what legislation does it cover?" (invokes `about`).

Each tool response ends with a source citation and a reminder that the output is not legal advice and should be verified against the official text at **www.gibraltarlaws.gov.gi**.

---

## Troubleshooting

**Server not listed or shows as failed in `claude mcp list`**
- Confirm the build step ran and `dist/index.js` exists at the path you registered.
- Run the command manually to check it starts without error:

  ```bash
  node "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"
  ```

  The process should start and wait on stdin (no crash). Press `Ctrl+C` to exit.

**`node: command not found`**
- Node.js is not installed or not on your `PATH`. Install Node 18+ and verify with `node --version`.

**Path errors after moving the repository**
- The registered command stores an absolute path. If you move or rename the project folder, remove and re-add the server:

  ```bash
  claude mcp remove gibraltar-prediction-markets
  claude mcp add gibraltar-prediction-markets -- node "/NEW/ABSOLUTE/PATH/dist/index.js"
  ```

**Changes to the server code not taking effect**
- Rebuild after editing the source: `npm run build`. Claude Code launches the compiled `dist/index.js`, not the TypeScript source.

**Removing the server**

```bash
claude mcp remove gibraltar-prediction-markets
```

---

*Source: Prediction Market Regulations 2026 (LN.2026/176), Gibraltar subsidiary legislation under the Gambling Act 2025. This documentation and the server's output are not legal advice; verify against the official text at [www.gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi).*
