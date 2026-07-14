/**
 * Data-access layer for the Prediction Market Regulations 2026 (LN.2026/176).
 *
 * Loads the authoritative structured JSON once, then exposes typed lookup and
 * keyword-search helpers. Every regulation, schedule and the definitions block
 * is normalised into a single flat `Document` list so that (a) the MCP tools and
 * (b) ChatGPT's required search/fetch contract can share one index. Search is a
 * dependency-free scored keyword match — deterministic, offline, and good enough
 * for a corpus of ~40 short legal documents.
 */
import { raw } from "./regulations.gen.js";

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
}

export interface Schedule {
  id: string;
  number: number;
  title: string;
  relatedRegulation: number;
  keywords: string[];
  items?: string[];
  text: string;
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
}

// Data is embedded at build time (see scripts/gen-data.mjs) so there is no
// runtime filesystem access — works identically for stdio and serverless.
export const data: RegulationsData = raw as RegulationsData;

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
    });
  }

  // Definitions as one browsable document.
  const defsText = data.definitions
    .map((d) => `"${d.term}" ${d.definition}`)
    .join("\n\n");
  docs.push({
    id: "definitions",
    kind: "definitions",
    title: "Regulation 3: Interpretation — Defined terms",
    text: defsText,
    keywords: ["definitions", "interpretation", "defined terms", "meaning"],
    citation: "Regulation 3 (Interpretation)",
  });

  return docs;
}

export const documents: Document[] = buildDocuments();

const CITATION_PREFIX =
  "Prediction Market Regulations 2026 (LN.2026/176), Gibraltar";

/** Tokenise to lowercase alphanumeric words for scoring. */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export interface SearchHit {
  id: string;
  title: string;
  citation: string;
  score: number;
  snippet: string;
}

/**
 * Score each document against the query terms. Title and keyword matches are
 * weighted above body matches so that "safeguarding" surfaces reg 19 ahead of
 * incidental mentions elsewhere. Returns hits sorted by descending score.
 */
export function search(query: string, limit = 10): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const doc of documents) {
    // Score on tokenized word boundaries, not raw substrings, so a short query
    // token like "act" does not score inside "contract"/"transaction" or "reg"
    // inside "register". Body occurrences are counted per exact token.
    const titleTokens = new Set(tokenize(doc.title));
    const keywordTokens = new Set(tokenize(doc.keywords.join(" ")));
    const bodyCounts = new Map<string, number>();
    for (const t of tokenize(doc.text)) bodyCounts.set(t, (bodyCounts.get(t) ?? 0) + 1);
    const bodyLower = doc.text.toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (titleTokens.has(term)) score += 8;
      if (keywordTokens.has(term)) score += 5;
      const bodyMatches = bodyCounts.get(term) ?? 0;
      score += Math.min(bodyMatches, 5) * 2;
    }
    // Bonus for phrase presence.
    if (terms.length > 1 && bodyLower.includes(terms.join(" "))) score += 6;

    if (score > 0) {
      hits.push({
        id: doc.id,
        title: doc.title,
        citation: `${CITATION_PREFIX} — ${doc.citation}`,
        score,
        snippet: buildSnippet(doc.text, terms),
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Return a short excerpt centred on the first matching term. */
function buildSnippet(text: string, terms: string[]): string {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found !== -1 && (idx === -1 || found < idx)) idx = found;
  }
  if (idx === -1) idx = 0;
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + 200);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet;
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
