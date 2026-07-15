/**
 * Live search verification: replays the golden-query fixture against a running
 * MCP server over streamable HTTP. Used post-deploy (and pre-merge against a
 * local `npm run start:http`).
 *
 *   node scripts/search-check.mjs [mcpUrl]      default: https://mcp.0xjb.dev/mcp
 *
 * Exits non-zero if any golden expectation fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL_ARG = process.argv[2] ?? "https://mcp.0xjb.dev/mcp";
const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "test", "golden-queries.json"), "utf8")
);

async function searchLive(query) {
  const r = await fetch(URL_ARG, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name: "search", arguments: { query } },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`${query}: ${JSON.stringify(j.error)}`);
  return JSON.parse(j.result.content[0].text).results ?? [];
}

let pass = 0, fail = 0;
for (const row of fixture.rows) {
  const results = await searchLive(row.query);
  const ids = results.map((h) => h.id);
  const problems = [];

  if (row.mustBeTop1 && ids[0] !== row.mustBeTop1) problems.push(`top1=${ids[0]}, want ${row.mustBeTop1}`);
  if (row.mustIncludeTop3) {
    for (const id of row.mustIncludeTop3) {
      if (!ids.slice(0, 3).includes(id)) problems.push(`${id} not in top3 [${ids.slice(0, 3)}]`);
    }
  }
  if (row.mustExcludeTop1 && ids[0] === row.mustExcludeTop1) problems.push(`${row.mustExcludeTop1} must not be top1`);
  if (row.snippetMatch) {
    const [docId, pattern] = row.snippetMatch.split(":");
    const hit = results.find((h) => h.id === docId);
    if (!hit || !new RegExp(pattern, "i").test(hit.snippet)) problems.push(`snippet for ${docId} lacks /${pattern}/i`);
  }

  if (problems.length) { fail++; console.log(`✖ "${row.query}" — ${problems.join("; ")}`); }
  else { pass++; console.log(`✔ "${row.query}"`); }
}

console.log(`\n${pass}/${pass + fail} golden queries pass against ${URL_ARG}`);
process.exit(fail === 0 ? 0 : 1);
