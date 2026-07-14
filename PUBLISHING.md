# Publishing checklist

This package is designed to be published to npm so that every client can connect with a single portable command:

```
npx -y gibraltar-prediction-markets-mcp
```

Until it is published, use the "local testing" forms in the per-client guides (`node dist/index.js`, or `npm link` to rehearse the `npx` experience).

## Before you publish

1. **Pick the final package name.** `gibraltar-prediction-markets-mcp` is currently unscoped. Check availability:
   ```bash
   npm view gibraltar-prediction-markets-mcp
   ```
   If taken, either choose another name or scope it (e.g. `@your-org/gibraltar-prediction-markets-mcp`) and update `name` in `package.json` and every `npx` command in `docs/` + `README.md`.

2. **Create the GitHub org and repo.** `package.json` points at `github.com/0xJB-dev/gibraltar-prediction-markets-mcp`. Create the free **`0xJB-dev` organization** (GitHub → *Your organizations* → *New organization*; you remain signed in as `magicmoam`), then create the public repo `gibraltar-prediction-markets-mcp` under it. Add the remote and push:
   ```bash
   git remote add origin https://github.com/0xJB-dev/gibraltar-prediction-markets-mcp.git
   git branch -M main
   git push -u origin main
   ```

3. **Confirm the build + tests pass** (also enforced automatically by `prepublishOnly`):
   ```bash
   npm run build && npm test
   ```

4. **Verify the tarball contents** — the published package must include `dist/`, `data/`, `docs/`, and `README.md`, and must NOT include the source PDF or `node_modules`:
   ```bash
   npm pack --dry-run
   ```
   Check `data/regulations.json` is listed (the server fails at runtime without it).

## Publish

```bash
npm login
npm publish            # add --access public if you used a scoped name
```

`prepublishOnly` runs the build and tests first, so a broken build cannot be published.

## After publishing

- Smoke-test the published package from a clean directory:
  ```bash
  cd /tmp && npx -y gibraltar-prediction-markets-mcp   # should start and wait on stdin
  ```
- Confirm the `npx` config works in Claude Desktop / Claude Code per the guides.
- Tag the release in git.

## Versioning

Bump with `npm version patch|minor|major` before each subsequent publish. If the **legislative text** is amended by a later LN, update `data/regulations.json` and `data/meta`, add a note to the changelog, and cut a new version.
