// Stemmer validation against the REAL corpus vocabulary (per plan A1):
// (a) every intended morphological family folds to one stem, and
// (b) no two unrelated corpus words collide on a stem.
import { test } from "node:test";
import assert from "node:assert/strict";
import { stem, tokenize, documents, STOPWORDS } from "../dist/data.js";

// (a) Families that MUST fold — includes non-corpus query-side forms.
const FAMILIES = [
  ["stablecoin", "stablecoins"],
  ["manipulate", "manipulation"],
  ["manipulated", "manipulation"],
  ["trade", "trading", "trades", "traded"],
  ["authorise", "authorisation", "authorised"],
  ["appeal", "appeals", "appealed"],
  ["settle", "settlement", "settled", "settling"],
  ["regulation", "regulations", "regulate"],
  ["suspend", "suspended"],
  ["condition", "conditions"],
  ["fee", "fees"],
  ["charge", "charges"],
  ["complaint", "complaints"],
  ["dispute", "disputes"],
  ["direction", "directions"],
  ["contract", "contracts"],
  ["participant", "participants"],
  ["operate", "operating", "operation"],
  ["bet", "bets", "betting"],
  ["gamble", "gambling"],
  ["safeguard", "safeguarding"],
  ["outsource", "outsourcing"],
  ["disclose", "disclosing"],
  ["revoke", "revoked"],
  ["prohibit", "prohibited"],
];

for (const family of FAMILIES) {
  test(`family folds: ${family.join(" / ")}`, () => {
    const stems = new Set(family.map(stem));
    assert.equal(stems.size, 1, `stems diverge: ${family.map((w) => `${w}→${stem(w)}`).join(", ")}`);
  });
}

// (b) Collision audit over the full corpus vocabulary. Words sharing a stem
// must look like one morphological family: the common prefix must be ≥4 chars
// or equal to the shortest word. Anything else needs an explicit entry in
// ALLOWED_GROUPS (currently empty — additions require review).
const ALLOWED_GROUPS = new Set([]);

test("no unrelated corpus words collide on a stem", () => {
  const vocab = new Set();
  for (const doc of documents) {
    for (const t of tokenize(`${doc.title} ${doc.keywords.join(" ")} ${doc.text}`)) {
      if (t.length >= 3 && /^[a-z]+$/.test(t) && !STOPWORDS.has(t)) vocab.add(t);
    }
  }
  assert.ok(vocab.size > 400, `corpus vocabulary unexpectedly small: ${vocab.size}`);

  const groups = new Map();
  for (const w of vocab) {
    const s = stem(w);
    if (!groups.has(s)) groups.set(s, []);
    groups.get(s).push(w);
  }

  const offenders = [];
  for (const [s, words] of groups) {
    if (words.length < 2) continue;
    words.sort();
    const key = words.join("|");
    if (ALLOWED_GROUPS.has(key)) continue;
    const shortest = words.reduce((a, b) => (a.length <= b.length ? a : b));
    let prefix = words[0];
    for (const w of words) {
      let i = 0;
      while (i < prefix.length && i < w.length && prefix[i] === w[i]) i++;
      prefix = prefix.slice(0, i);
    }
    // Same family if: long shared prefix, one word is the others' prefix, or
    // the shared prefix IS the stem itself (bets/betting → bet: base form
    // simply absent from the corpus).
    if (prefix.length >= 4 || prefix === shortest || prefix === s) continue;
    offenders.push(`${s}: [${words.join(", ")}] (common prefix "${prefix}")`);
  }
  assert.deepEqual(offenders, [], `suspicious stem collisions:\n${offenders.join("\n")}`);
});
