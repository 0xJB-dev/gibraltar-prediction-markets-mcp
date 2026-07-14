/**
 * Build-time codegen: embed data/regulations.json into a TypeScript source module
 * so the legislative text is bundled into the compiled output rather than read
 * from disk at runtime. This makes the server work identically under a plain
 * Node process (stdio) and a serverless bundler (Vercel), where a runtime
 * readFileSync of a sibling data file is unreliable.
 *
 * The JSON is embedded as a single escaped string and JSON.parse'd at module load
 * — trivial for the compiler (one string literal) and zero filesystem access.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const json = readFileSync(join(root, "data", "regulations.json"), "utf-8");
JSON.parse(json); // validate before embedding
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const out =
  "// AUTO-GENERATED from data/regulations.json by scripts/gen-data.mjs. Do not edit.\n" +
  `export const raw: unknown = JSON.parse(${JSON.stringify(json)});\n` +
  `export const pkgVersion = ${JSON.stringify(pkg.version)};\n`;

writeFileSync(join(root, "src", "regulations.gen.ts"), out);
console.error("Generated src/regulations.gen.ts from data/regulations.json");
