# Claude Desktop Setup

Install the Gibraltar Prediction Markets MCP server in Claude Desktop so you can query the Prediction Market Regulations 2026 (LN.2026/176) directly from your chats.

## Overview

Claude Desktop connects to this server over the local **stdio** transport. Claude launches the server as a child process (`node dist/index.js`); no network endpoint or public URL is required. Once configured, ten tools become available in Claude Desktop: `search`, `fetch`, `get_regulation`, `list_regulations`, `get_part`, `get_schedule`, `get_definition`, `get_application_checklist`, `get_authorisation_conditions`, and `about`.

## Prerequisites

- **Node.js 18 or later.** Confirm your version:

  ```bash
  node --version
  ```

- **Claude Desktop** installed (macOS or Windows).
- **A built copy of this server.** From the repository root, install dependencies and compile:

  ```bash
  cd "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC"
  npm install && npm run build
  ```

  This produces `dist/index.js`, the stdio entry point referenced by the configuration below. Confirm it exists:

  ```bash
  ls "/Users/jawaadbokhari/Documents/Companies/Personal/Prediction Markets MPC/dist/index.js"
  ```

## Configure Claude Desktop

Claude Desktop reads server definitions from `claude_desktop_config.json`. Open the file for your operating system (create it if it does not exist):

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

You can open the file on macOS with:

```bash
open -e "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
```

Add the `gibraltar-prediction-markets` entry inside `mcpServers`. If the file already contains other servers, add this entry alongside them rather than replacing the object.

### Recommended (after the package is published to npm)

No build, no path — `npx` fetches and runs the server on demand. This is the config to hand to any user on any machine:

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

### Local testing (before publishing)

While the package is unpublished, point Claude Desktop at your built entry point using an absolute path:

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

Notes:

- For the **local** form, use an **absolute path** to `dist/index.js`. Relative paths and `~` are not expanded here.
- On Windows, write the path with escaped backslashes, for example `"C:\\Users\\you\\prediction-markets-mpc\\dist\\index.js"`, or use forward slashes.
- The JSON must be valid — a stray trailing comma will prevent the server from loading.
- The `npx` form requires Node/npm on the `PATH` Claude Desktop inherits (see Troubleshooting if `npx` isn't found).

## Restart and confirm

1. **Quit Claude Desktop completely** (on macOS, use Cmd+Q; a window close is not enough) and reopen it. Claude reads the configuration only at startup.
2. Open a new chat. Open the tools / connectors control (the tools icon in the message composer) and confirm **gibraltar-prediction-markets** is listed with its ten tools enabled.
3. Verify end to end by asking the model to run the `about` tool (see the first example prompt below). A successful response returns server information and ends with a source citation and a "not legal advice" reminder.

## Example prompts

Once the server appears, type prompts like these. Claude will select the appropriate tool automatically.

- **Orientation:**
  > Use the gibraltar-prediction-markets tools. Run `about` and give me an overview of the Prediction Market Regulations 2026, then list all 34 regulations.

- **Targeted lookup:**
  > What are the authorisation conditions under the Prediction Market Regulations 2026? Then show me the full text of regulation 12.

- **Applying for authorisation:**
  > Pull the application checklist and the definition of "prediction market", and summarise what an operator must submit to be authorised in Gibraltar.

Each tool response cites its source in the official legislation and reminds you that the output is not legal advice and should be verified against the official version at [gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi).

## Troubleshooting

**Server does not appear in Claude Desktop**
- Confirm you fully quit and relaunched Claude Desktop after editing the config.
- Validate the JSON. On macOS you can check it from a terminal:

  ```bash
  cat "$HOME/Library/Application Support/Claude/claude_desktop_config.json" | python3 -m json.tool
  ```

  If this prints an error, fix the reported syntax problem (commonly a missing comma or unbalanced brace).
- Confirm the config file is in the exact location listed above for your OS.

**"node: command not found" or the server fails to start**
- Claude launches the server using the `node` on its `PATH`. If `node --version` works in your terminal but the server still fails, provide the full path to the Node binary in `command`. Find it with:

  ```bash
  which node
  ```

  Then set, for example, `"command": "/usr/local/bin/node"` (or your Homebrew/nvm path) instead of `"node"`.
- If you use a version manager such as `nvm`, the interactive `node` may not be on the `PATH` Claude Desktop inherits. Using the absolute Node path as above resolves this.

**"Cannot find module .../dist/index.js"**
- The build has not run or the path is wrong. Re-run `npm install && npm run build` from the repository root and confirm `dist/index.js` exists (see Prerequisites).
- Check that the path in `args` exactly matches the absolute location of the file, including capitalisation and spaces. The path in the facts above contains spaces; keep it inside the quotes as a single array element.

**Tools appear but every call errors**
- Ensure the `data/regulations.json` file ships alongside `dist/`. It is part of this repository; if you copied only `dist/`, copy the `data/` directory too, or run the server from the repository root.
- Restart Claude Desktop after rebuilding.

---

Source: Prediction Market Regulations 2026 (LN.2026/176), Gibraltar subsidiary legislation under the Gambling Act 2025. © Government of Gibraltar ([www.gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi)). This documentation is not legal advice; verify against the official version at gibraltarlaws.gov.gi.
