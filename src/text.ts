/**
 * Text-processing primitives for search: tokenizer, conservative stemmer,
 * stopword list and boilerplate damping.
 *
 * The stemmer is deliberately small and validated against the corpus vocabulary
 * by a table test (test/stemmer.test.js): every intended morphological family in
 * the Regulations must fold to one stem, and no two unrelated corpus words may
 * collide. It is applied identically to indexed text and to queries — never mix
 * stemmer versions across the two sides.
 */

/** Lowercase alphanumeric word tokens; hyphens and punctuation become spaces. */
export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Query-side function words, always stripped. Statutory phrases containing them
 * ("fit and proper", "own account") are still matched via the phrase check,
 * which runs on the original token sequence — protection is phrase-level only.
 */
export const STOPWORDS = new Set([
  "a", "an", "the", "it", "its", "own", "against", "can", "could", "may",
  "might", "must", "shall", "will", "would", "should", "of", "to", "in", "on",
  "at", "or", "and", "by", "not", "be", "is", "are", "was", "were", "been",
  "do", "does", "did", "done", "what", "how", "when", "where", "which", "who",
  "whom", "why", "we", "you", "they", "he", "she", "them", "us", "my", "our",
  "your", "their", "this", "that", "these", "those", "with", "for", "from",
  "as", "if", "than", "then", "so", "but", "about", "into", "under", "over",
  "any", "there", "here", "such", "no", "yes", "have", "has", "had", "need",
  "want", "get", "am", "i",
]);

/**
 * Stems whose body-count contribution is halved: statutory boilerplate that
 * appears in nearly every provision ("these Regulations", "the Act", "Part N")
 * and would otherwise dominate ranking once morphology folds "regulation(s)".
 */
export const DAMPED_STEMS = new Set(["regul", "act", "part"]);

/**
 * Conservative suffix stemmer. Rule order matters; each rule fires at most once.
 * Guards keep short words intact and avoid known corpus collisions:
 *  1. plurals: -ies→y, -es→∅ (stem ≥3), -s→∅ (stem ≥3, not -ss)
 *  2. verbal: -ing→∅, -ed→∅ (stem ≥3), collapsing a doubled final consonant
 *  3. nominal: -ment→∅ (stem ≥4), -ion→∅ (stem ≥4)
 *  4. final-e strip (stem ≥4) — unifies manipulate/manipulation, trade/trading
 *  5. trailing -at strip (stem ≥5) — unifies authorise/authorisation via
 *     authoris; keeps the operate family internally consistent (all → oper)
 */
export function stem(word: string): string {
  let w = word;

  // 1. plurals
  if (w.endsWith("ies") && w.length - 3 >= 2) {
    w = w.slice(0, -3) + "y";
  } else if (w.endsWith("es") && w.length - 2 >= 3) {
    w = w.slice(0, -2);
  } else if (w.endsWith("s") && !w.endsWith("ss") && w.length - 1 >= 3) {
    w = w.slice(0, -1);
  }

  // 2. verbal suffixes
  if (w.endsWith("ing") && w.length - 3 >= 3) {
    w = w.slice(0, -3);
    w = collapseDouble(w);
  } else if (w.endsWith("ed") && w.length - 2 >= 3) {
    w = w.slice(0, -2);
    w = collapseDouble(w);
  }

  // 3. nominal suffixes
  if (w.endsWith("ment") && w.length - 4 >= 4) {
    w = w.slice(0, -4);
  } else if (w.endsWith("ion") && w.length - 3 >= 4) {
    w = w.slice(0, -3);
  }

  // 4. final-e
  if (w.endsWith("e") && w.length - 1 >= 4) {
    w = w.slice(0, -1);
  }

  // 5. trailing -at (post -ion/-e), e.g. authorisat→authoris, manipulat→manipul
  if (w.endsWith("at") && w.length - 2 >= 5) {
    w = w.slice(0, -2);
  }

  return w;
}

/** permitt→permit, prohibitt-style doubles after -ing/-ed stripping. */
function collapseDouble(w: string): string {
  const n = w.length;
  if (n >= 2 && w[n - 1] === w[n - 2] && !"aeiou".includes(w[n - 1]) && w[n - 1] !== "s") {
    return w.slice(0, -1);
  }
  return w;
}

/** Tokenize then stem, dropping stopwords — the query-side content terms. */
export function contentTerms(query: string): { original: string; stemmed: string }[] {
  return tokenize(query)
    .filter((t) => !STOPWORDS.has(t))
    .map((t) => ({ original: t, stemmed: stem(t) }));
}
