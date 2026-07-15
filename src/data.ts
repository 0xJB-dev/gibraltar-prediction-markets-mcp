/**
 * Data-access layer for the Prediction Market Regulations 2026 (LN.2026/176).
 *
 * Every regulation, schedule and the definitions block is normalised into a
 * single flat `Document` list so the MCP tools and ChatGPT's search/fetch
 * contract share one index.
 *
 * Search design (v1.0.3): conservative stemming on both index and query,
 * stopword stripping, curated lay→statutory synonym expansion at reduced
 * weight, a distinct-term coverage multiplier, and a phrase bonus evaluated on
 * normalized text (hyphens folded) against the ORIGINAL query token sequence.
 * Exact matches always outrank stem matches, which outrank synonym expansions
 * (integer weights 10 : 8 : 6 per body occurrence; 40/25 : 32/20 : 24/15 for
 * title/keyword fields). Scoring is per-term-per-field at most once — never
 * both the exact and stem path for the same term.
 */
import { raw } from "./regulations.gen.js";
import { tokenize, stem, contentTerms, STOPWORDS, DAMPED_STEMS } from "./text.js";
import { WORD_SYNONYMS, PHRASE_SYNONYMS } from "./synonyms.js";

export interface Definition {
  term: string;
  definition: string;
}

export interface Regulation {
  id: string;
  number: number;
  part: number;
  partTitle: string;
  title: string;
  keywords: string[];
  text: string;
  page?: number;
}

export interface Schedule {
  id: string;
  number: number;
  title: string;
  relatedRegulation: number;
  keywords: string[];
  items?: string[];
  text: string;
  page?: number;
}

export interface Part {
  number: number;
  title: string;
  regulations: number[];
}

export interface RegulationsData {
  meta: Record<string, unknown>;
  parts: Part[];
  definitions: Definition[];
  regulations: Regulation[];
  schedules: Schedule[];
}

/** A single addressable, searchable unit (regulation, schedule, or the definitions set). */
export interface Document {
  id: string;
  kind: "regulation" | "schedule" | "definitions";
  title: string;
  text: string;
  keywords: string[];
  /** Human citation, e.g. "Regulation 12" or "Schedule 2". */
  citation: string;
  /** Page in the official PDF where the provision starts. */
  page?: number;
  /** Deep link into the official PDF (unique per document — clients dedupe URLs). */
  officialUrl: string;
}

// Data is embedded at build time (see scripts/gen-data.mjs) so there is no
// runtime filesystem access — works identically for stdio and serverless.
export const data: RegulationsData = raw as RegulationsData;

const OFFICIAL_PDF = String(data.meta.officialTextUrl ?? "https://www.gibraltarlaws.gov.gi");

function officialUrlFor(id: string, page?: number): string {
  // #page=N jumps PDF viewers to the provision; the extra &provision= parameter
  // is ignored by viewers (PDF Open Parameters) but keeps every document's URL
  // unique — citation-rendering clients dedupe identical URLs.
  return page
    ? `${OFFICIAL_PDF}#page=${page}&provision=${id}`
    : `${OFFICIAL_PDF}#${id}`;
}

/** Build the flat document index used by search() and fetchDocument(). */
function buildDocuments(): Document[] {
  const docs: Document[] = [];

  for (const reg of data.regulations) {
    docs.push({
      id: reg.id,
      kind: "regulation",
      title: `Regulation ${reg.number}: ${reg.title}`,
      text: reg.text,
      keywords: reg.keywords,
      citation: `Regulation ${reg.number}`,
      page: reg.page,
      officialUrl: officialUrlFor(reg.id, reg.page),
    });
  }

  for (const sch of data.schedules) {
    docs.push({
      id: sch.id,
      kind: "schedule",
      title: `Schedule ${sch.number}: ${sch.title}`,
      text: sch.text,
      keywords: sch.keywords,
      citation: `Schedule ${sch.number}`,
      page: sch.page,
      officialUrl: officialUrlFor(sch.id, sch.page),
    });
  }

  const defsText = data.definitions
    .map((d) => `"${d.term}" ${d.definition}`)
    .join("\n\n");
  const defsPage = Number(data.meta.definitionsPage) || undefined;
  docs.push({
    id: "definitions",
    kind: "definitions",
    title: "Regulation 3: Interpretation — Defined terms",
    text: defsText,
    keywords: ["definitions", "interpretation", "defined terms", "meaning"],
    citation: "Regulation 3 (Interpretation)",
    page: defsPage,
    officialUrl: officialUrlFor("definitions", defsPage),
  });

  return docs;
}

export const documents: Document[] = buildDocuments();

const CITATION_PREFIX =
  "Prediction Market Regulations 2026 (LN.2026/176), Gibraltar";

// ---------------------------------------------------------------------------
// Search index — built once at module load (~1ms for this corpus).
// ---------------------------------------------------------------------------

interface DocIndex {
  doc: Document;
  titleExact: Set<string>;
  titleStems: Set<string>;
  kwExact: Set<string>;
  kwStems: Set<string>;
  bodyExact: Map<string, number>;
  bodyStems: Map<string, number>;
  /** First surface form seen in the body for each stem — for snippets. */
  stemSurface: Map<string, string>;
  /** Tokenized text joined by single spaces (hyphens folded) with guard spaces. */
  normAll: string;
}

function buildIndex(): DocIndex[] {
  return documents.map((doc) => {
    const titleTokens = tokenize(doc.title);
    const kwTokens = tokenize(doc.keywords.join(" "));
    const bodyTokens = tokenize(doc.text);

    const bodyExact = new Map<string, number>();
    const bodyStems = new Map<string, number>();
    const stemSurface = new Map<string, string>();
    for (const t of bodyTokens) {
      bodyExact.set(t, (bodyExact.get(t) ?? 0) + 1);
      const s = stem(t);
      bodyStems.set(s, (bodyStems.get(s) ?? 0) + 1);
      if (!stemSurface.has(s)) stemSurface.set(s, t);
    }

    // One normalized haystack for phrase checks across title, keywords and body.
    const normAll = ` ${titleTokens.join(" ")} ${kwTokens.join(" ")} ${bodyTokens.join(" ")} `;

    return {
      doc,
      titleExact: new Set(titleTokens),
      titleStems: new Set(titleTokens.map(stem)),
      kwExact: new Set(kwTokens),
      kwStems: new Set(kwTokens.map(stem)),
      bodyExact,
      bodyStems,
      stemSurface,
      normAll,
    };
  });
}

const index: DocIndex[] = buildIndex();

/** Synonym keys are lay words; index them by stem so plural queries hit too. */
const STEMMED_WORD_SYNONYMS = new Map<string, string[]>();
for (const [k, v] of Object.entries(WORD_SYNONYMS)) {
  const s = stem(k);
  const existing = STEMMED_WORD_SYNONYMS.get(s) ?? [];
  STEMMED_WORD_SYNONYMS.set(s, [...new Set([...existing, ...v])]);
}

// Integer weights: exact : stem : synonym = 10 : 8 : 6 (per body occurrence,
// capped at 5 occurrences); title 40/32/24; keywords 25/20/15.
const W = {
  titleExact: 40, titleStem: 32, titleSyn: 24,
  kwExact: 25, kwStem: 20, kwSyn: 15,
  bodyExact: 10, bodyStem: 8, bodySyn: 6,
  bodyCap: 5,
  phraseBonus: 30,
  synPhraseTitle: 24, synPhraseKw: 15, synPhraseBody: 10,
  coverage: 0.75,
  synCoverage: 0.6,
};

export interface SearchHit {
  id: string;
  title: string;
  citation: string;
  score: number;
  snippet: string;
  url: string;
}

interface Expansion {
  text: string;          // single word or phrase
  isPhrase: boolean;
  forTerm: number;       // index of the content term this expansion belongs to
}

/**
 * Collect synonym expansions for the query: word-level (matched by surface or
 * stem of each content term) and phrase-level (lay phrase inside the query's
 * token sequence, attributed to its first content term for coverage).
 */
function collectExpansions(
  rawTokens: string[],
  terms: { original: string; stemmed: string }[]
): Expansion[] {
  const out: Expansion[] = [];
  const seen = new Set<string>();

  terms.forEach((t, i) => {
    const expansions = WORD_SYNONYMS[t.original] ?? STEMMED_WORD_SYNONYMS.get(t.stemmed) ?? [];
    for (const e of expansions) {
      if (seen.has(e)) continue;
      seen.add(e);
      out.push({ text: e, isPhrase: e.includes(" "), forTerm: i });
    }
  });

  const querySeq = ` ${rawTokens.join(" ")} `;
  for (const { phrase, expand } of PHRASE_SYNONYMS) {
    if (!querySeq.includes(` ${phrase} `)) continue;
    const phraseTokens = phrase.split(" ");
    let forTerm = terms.findIndex((t) => phraseTokens.includes(t.original));
    if (forTerm === -1) forTerm = 0;
    for (const e of expand) {
      if (seen.has(e)) continue;
      seen.add(e);
      out.push({ text: e, isPhrase: e.includes(" "), forTerm });
    }
  }

  return out;
}

/**
 * Score each document. Per content term, each field (title/keywords/body)
 * contributes at most once: exact wins over stem, damped stems halve body
 * contributions. Synonym expansions score at 0.6× and count 0.6 toward
 * coverage when their term is otherwise unmatched. Final score is multiplied
 * by the coverage factor 1 + 0.75·(m−1)/max(1, n−1).
 */
export function search(query: string, limit = 10): SearchHit[] {
  const rawTokens = tokenize(query);
  const terms = dedupeByStem(contentTerms(query));
  if (terms.length === 0 && rawTokens.length === 0) return [];

  const expansions = collectExpansions(rawTokens, terms);
  const hits: SearchHit[] = [];

  for (const d of index) {
    let base = 0;
    const matchedTerms = new Array<number>(terms.length).fill(0); // 0 | 0.6 | 1
    const surfaces: string[] = [];

    terms.forEach((t, i) => {
      let termScore = 0;

      if (d.titleExact.has(t.original)) termScore += W.titleExact;
      else if (d.titleStems.has(t.stemmed)) termScore += W.titleStem;

      if (d.kwExact.has(t.original)) termScore += W.kwExact;
      else if (d.kwStems.has(t.stemmed)) termScore += W.kwStem;

      const damp = DAMPED_STEMS.has(t.stemmed) ? 0.5 : 1;
      const exactCount = d.bodyExact.get(t.original) ?? 0;
      const stemCount = d.bodyStems.get(t.stemmed) ?? 0;
      if (exactCount > 0) {
        termScore += Math.min(exactCount, W.bodyCap) * W.bodyExact * damp;
        surfaces.push(t.original);
      } else if (stemCount > 0) {
        termScore += Math.min(stemCount, W.bodyCap) * W.bodyStem * damp;
        const surf = d.stemSurface.get(t.stemmed);
        if (surf) surfaces.push(surf);
      } else if (termScore > 0) {
        surfaces.push(t.original);
      }

      if (termScore > 0) {
        base += termScore;
        matchedTerms[i] = 1;
      }
    });

    for (const e of expansions) {
      let expScore = 0;
      if (e.isPhrase) {
        const needle = ` ${e.text} `;
        if (d.normAll.includes(needle)) {
          // Attribute at the strongest tier the phrase appears in.
          const inTitle = ` ${tokenize(d.doc.title).join(" ")} `.includes(needle);
          expScore = inTitle ? W.synPhraseTitle : W.synPhraseKw;
          surfaces.push(e.text);
        }
      } else {
        const es = stem(e.text);
        if (d.titleExact.has(e.text)) expScore += W.titleSyn;
        else if (d.titleStems.has(es)) expScore += W.titleSyn * 0.8;
        if (d.kwExact.has(e.text)) expScore += W.kwSyn;
        else if (d.kwStems.has(es)) expScore += W.kwSyn * 0.8;
        const c = d.bodyExact.get(e.text) ?? d.bodyStems.get(es) ?? 0;
        if (c > 0) {
          expScore += Math.min(c, W.bodyCap) * W.bodySyn;
          surfaces.push(d.stemSurface.get(es) ?? e.text);
        }
      }
      if (expScore > 0) {
        base += expScore;
        if (matchedTerms[e.forTerm] === 0) matchedTerms[e.forTerm] = W.synCoverage;
      }
    }

    // Phrase bonus: the ORIGINAL query token sequence appearing verbatim in the
    // normalized text (hyphens folded) — never the stemmed/stripped terms.
    if (rawTokens.length >= 2 && d.normAll.includes(` ${rawTokens.join(" ")} `)) {
      base += W.phraseBonus;
    }

    if (base <= 0) continue;

    const n = terms.length;
    const m = matchedTerms.reduce((a, b) => a + b, 0);
    const coverage = n > 1 ? 1 + W.coverage * ((m - 1) / (n - 1)) : 1;
    const score = base * coverage;

    hits.push({
      id: d.doc.id,
      title: d.doc.title,
      citation: `${CITATION_PREFIX} — ${d.doc.citation}`,
      score,
      snippet: buildSnippet(d.doc.text, surfaces),
      url: d.doc.officialUrl,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return hits.slice(0, limit);
}

/** Keep the first term for each distinct stem (avoids double-scoring "trade trading"). */
function dedupeByStem(terms: { original: string; stemmed: string }[]): { original: string; stemmed: string }[] {
  const seen = new Set<string>();
  return terms.filter((t) => (seen.has(t.stemmed) ? false : (seen.add(t.stemmed), true)));
}

/**
 * Excerpt centred on the earliest matched surface form, located at a word
 * boundary in the original text (hyphen-tolerant for phrases). Falls back to
 * the document start only when no surface form is found.
 */
function buildSnippet(text: string, surfaces: string[]): string {
  let idx = -1;
  for (const s of surfaces) {
    const pattern = s
      .split(" ")
      .map((w) => escapeRegExp(w))
      .join("[\\s-]+");
    const re = new RegExp(`\\b${pattern}`, "i");
    const m = re.exec(text);
    if (m && (idx === -1 || m.index < idx)) idx = m.index;
  }
  if (idx === -1) idx = 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + 200);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fetchDocument(id: string): Document | undefined {
  return documents.find((d) => d.id === id);
}

export function getRegulation(number: number): Regulation | undefined {
  return data.regulations.find((r) => r.number === number);
}

export function getSchedule(number: number): Schedule | undefined {
  return data.schedules.find((s) => s.number === number);
}

export function getPart(number: number): { part: Part; regulations: Regulation[] } | undefined {
  const part = data.parts.find((p) => p.number === number);
  if (!part) return undefined;
  const regulations = data.regulations.filter((r) => r.part === number);
  return { part, regulations };
}

/** Look up a defined term; case-insensitive, tolerant of surrounding quotes. */
export function getDefinition(term: string): Definition | undefined {
  const needle = term.toLowerCase().replace(/["“”]/g, "").trim();
  return data.definitions.find(
    (d) => d.term.toLowerCase() === needle
  ) ?? data.definitions.find((d) => d.term.toLowerCase().includes(needle));
}

export function listRegulations(): Array<{ number: number; title: string; part: number; partTitle: string }> {
  return data.regulations.map((r) => ({
    number: r.number,
    title: r.title,
    part: r.part,
    partTitle: r.partTitle,
  }));
}

export function fullCitation(): string {
  return CITATION_PREFIX;
}

// Re-exported for tests (tokenizer/stemmer parity checks).
export { tokenize, stem, STOPWORDS };
