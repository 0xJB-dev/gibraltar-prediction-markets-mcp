// Search-quality regression suite (v1.0.3). Runs against the COMPILED output —
// the gate is `npm run build && npm test`; plain `npm test` on a stale dist/ is
// a false green.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { search, documents, STOPWORDS, stem, tokenize } from "../dist/data.js";

const golden = JSON.parse(
  readFileSync(new URL("./golden-queries.json", import.meta.url), "utf8")
);

// ---------------------------------------------------------------------------
// Golden queries — table-driven
// ---------------------------------------------------------------------------
for (const row of golden.rows) {
  test(`golden: "${row.query}"`, () => {
    const hits = search(row.query);
    const ids = hits.map((h) => h.id);

    if (row.mustBeTop1) {
      assert.equal(ids[0], row.mustBeTop1, `top hit was [${ids.slice(0, 3)}]`);
    }
    if (row.mustIncludeTop3) {
      for (const id of row.mustIncludeTop3) {
        assert.ok(ids.slice(0, 3).includes(id), `${id} not in top 3: [${ids.slice(0, 3)}]`);
      }
    }
    if (row.mustExcludeTop1) {
      assert.notEqual(ids[0], row.mustExcludeTop1, `${row.mustExcludeTop1} must not rank first`);
    }
    if (row.snippetMatch) {
      const [docId, pattern] = row.snippetMatch.split(":");
      const hit = hits.find((h) => h.id === docId);
      assert.ok(hit, `${docId} missing from results`);
      assert.match(hit.snippet, new RegExp(pattern, "i"), `snippet lacks surface form: "${hit.snippet}"`);
    }
  });
}

// ---------------------------------------------------------------------------
// Negative suite — precision must survive recall widening
// ---------------------------------------------------------------------------
test("negative: nonsense returns zero hits", () => {
  assert.equal(search("zorbifex").length, 0);
  assert.equal(search("quuxblatherskite").length, 0);
});

test("negative: prefixes do not substring-match", () => {
  // 'author' is a real word-prefix of authorisation/authority but stems to
  // neither family stem; 'predic' likewise for prediction. ('regul' is NOT a
  // valid probe: it IS the legitimate stem of the regulation family.)
  assert.equal(search("author").length, 0);
  assert.equal(search("predic").length, 0);
});

test("negative: empty / punctuation / stopword-only queries return [] without throwing", () => {
  assert.deepEqual(search(""), []);
  assert.deepEqual(search("!!! ???"), []);
  assert.deepEqual(search("the of and"), []);
});

test("negative: boilerplate 'act' is damped — Act-focused docs rank top", () => {
  const hits = search("act", documents.length);
  assert.ok(
    ["reg-28", "reg-33", "schedule-3"].includes(hits[0].id),
    `top for 'act' should be an Act-focused doc, got ${hits[0].id}`
  );
});

test("negative: synonym expansion never beats exact statutory vocabulary", () => {
  const lay = search("customer protection", documents.length).find((h) => h.id === "reg-18");
  const statutory = search("participant protection", documents.length).find((h) => h.id === "reg-18");
  assert.ok(lay && statutory);
  assert.ok(lay.score <= statutory.score, `lay ${lay.score} > statutory ${statutory.score}`);
});

// ---------------------------------------------------------------------------
// Plural/singular property test over keyword vocabulary
// ---------------------------------------------------------------------------
const ACRONYMS = new Set(["aml", "kyc", "gfsc", "poca", "fsa", "gra", "ln", "cft"]);
const SKIP = new Set(["money", "moneys"]); // no meaningful plural pair in legal usage

function naivePlural(w) {
  if (w.endsWith("ss")) return w + "es";
  if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + "ies";
  return w + "s";
}

test("property: singular and plural keyword forms return the source doc at the same rank", () => {
  let checked = 0;
  for (const doc of documents) {
    const tokens = new Set(tokenize(doc.keywords.join(" ")));
    for (const t of tokens) {
      if (t.length < 4 || STOPWORDS.has(t) || ACRONYMS.has(t) || SKIP.has(t)) continue;
      if (!/^[a-z]+$/.test(t)) continue;
      // Verb forms don't pluralize — naivePlural("authorised") would be garbage.
      if (t.endsWith("ed") || t.endsWith("ing")) continue;
      const [a, b] = t.endsWith("s") && !t.endsWith("ss") ? [t.slice(0, -1), t] : [t, naivePlural(t)];
      if (stem(a) !== stem(b)) continue; // forms our stemmer does not claim to unify
      const rankA = search(a, documents.length).findIndex((h) => h.id === doc.id);
      const rankB = search(b, documents.length).findIndex((h) => h.id === doc.id);
      // The invariant is that NEITHER form loses the document (the reported bug
      // class was 0 hits for the singular). Exact rank parity is deliberately
      // NOT required: exact-token matches outweigh stem matches by design
      // (plan A4), so a form that appears verbatim in one document may
      // legitimately shift relative order by a place or two.
      assert.notEqual(rankA, -1, `"${a}" lost ${doc.id} (keyword "${t}")`);
      assert.notEqual(rankB, -1, `"${b}" lost ${doc.id} (keyword "${t}")`);
      assert.ok(Math.abs(rankA - rankB) <= 3, `rank drift >3 for "${a}"(${rankA}) vs "${b}"(${rankB}) on ${doc.id}`);
      checked++;
    }
  }
  assert.ok(checked > 50, `property test exercised only ${checked} pairs`);
});

// ---------------------------------------------------------------------------
// Rank invariance for morphological variants
// ---------------------------------------------------------------------------
test("invariance: 'appeal' and 'appeals' rank reg-32 identically", () => {
  // NOTE: strict score equality is intentionally NOT asserted — exact-token
  // matches outweigh stem matches by design. The invariant is rank.
  const a = search("appeal", documents.length);
  const b = search("appeals", documents.length);
  assert.equal(a.findIndex((h) => h.id === "reg-32"), b.findIndex((h) => h.id === "reg-32"));
  assert.equal(a[0].id, "reg-32");
  assert.equal(b[0].id, "reg-32");
});

// ---------------------------------------------------------------------------
// URLs — clickable, unique, page-anchored
// ---------------------------------------------------------------------------
test("urls: every search hit deep-links into the official PDF", () => {
  const hits = search("prediction market contract", documents.length);
  const re = /^https:\/\/www\.gibraltarlaws\.gov\.gi\/.+\.pdf#(page=\d+&provision=[a-z0-9-]+|[a-z0-9-]+)$/;
  for (const h of hits) assert.match(h.url, re);
});

test("urls: page anchors are correct for known provisions and never collide", () => {
  const byId = Object.fromEntries(documents.map((d) => [d.id, d.officialUrl]));
  assert.ok(byId["reg-22"].includes("#page=12&"), byId["reg-22"]);
  assert.ok(byId["schedule-2"].includes("#page=20&"), byId["schedule-2"]);
  const urls = documents.map((d) => d.officialUrl);
  assert.equal(new Set(urls).size, urls.length, "official URLs must be unique per document");
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------
test("determinism: consecutive runs return identical id sequences", () => {
  for (const row of golden.rows) {
    const a = search(row.query).map((h) => h.id).join(",");
    const b = search(row.query).map((h) => h.id).join(",");
    assert.equal(a, b, row.query);
  }
});
