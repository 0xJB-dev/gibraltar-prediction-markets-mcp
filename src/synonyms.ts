/**
 * Curated lay→statutory synonym map for query expansion.
 *
 * Reviewed data, not code: additions require the same review discipline as the
 * corpus. Expansions score at 0.6× the exact-match weight and count 0.6 toward
 * coverage, so exact statutory vocabulary always outranks an expansion match.
 * Multi-word expansions are matched as whole phrases against the normalized
 * body text — never tokenized into common words.
 *
 * DELIBERATELY UNMAPPED — do not "fix" these without re-reading the statute:
 *  - bet/wager → trading: REJECTED. Reg 4(3): prediction market activity "is
 *    not to be treated as betting, gaming or a lottery". Expanding into
 *    'trading' would steer users into the frame the statute rejects; the row
 *    below targets reg 4's own vocabulary instead.
 *  - sanction(s) → enforcement: REJECTED. In-corpus "sanctions" means financial
 *    sanctions / AML (reg 21); enforcement lives in "sanctioning powers"
 *    (Schedule 3). The fine/penalty row covers the enforcement sense.
 *  - permission → authorisation: REJECTED. Collides with reg 33's FSA 2019
 *    "Part 7 permission" — a different regime.
 *  - trading → trading and other identity entries: stemming owns morphology.
 *  - Note: licence → authorisation is kept for recall, but the
 *    authorisation-is-not-a-licence point (regs 3(3), 6(3)-(4)) is substantive;
 *    the retained original token keeps reg 6 surfacing for licence queries.
 */

/** Single lay token (matched by stem OR surface form) → statutory expansions. */
export const WORD_SYNONYMS: Record<string, string[]> = {
  // people
  customer: ["participant"],
  client: ["participant"],
  user: ["participant"],
  trader: ["participant"],
  punter: ["participant"],
  consumer: ["participant"],
  investor: ["participant"],
  // betting frame → reg 4's own terms
  bet: ["betting", "gaming", "lottery"],
  wager: ["betting", "gaming", "lottery"],
  gamble: ["betting", "gaming", "lottery"],
  // instruments
  oracle: ["settlement source"],
  crypto: ["digital asset", "stablecoin"],
  cryptocurrency: ["digital asset", "stablecoin"],
  token: ["digital asset", "stablecoin"],
  usdc: ["stablecoin", "digital asset"],
  usdt: ["stablecoin", "digital asset"],
  bitcoin: ["digital asset"],
  blockchain: ["digital asset"],
  wallet: ["digital asset", "safeguarding"],
  // permissions
  licence: ["authorisation"],
  license: ["authorisation"],
  permit: ["authorisation"],
  // institutions
  regulator: ["authority", "commissioner"],
  watchdog: ["authority", "commissioner"],
  gra: ["authority", "commissioner"],
  // market conduct
  spoofing: ["market manipulation", "market integrity", "wash trading"],
  // financial standing
  capital: ["financial resources"],
  solvency: ["financial resources"],
  bankrupt: ["insolvency", "wind down", "recovery plan"],
  bankruptcy: ["insolvency", "wind down", "recovery plan"],
  collapse: ["insolvency", "wind down"],
  deposit: ["client money", "safeguarding", "participant balances"],
  // enforcement (lay)
  ban: ["suspension", "revocation"],
  fine: ["sanctioning", "enforcement", "suspension", "revocation", "directions"],
  penalty: ["sanctioning", "enforcement", "suspension", "revocation", "directions"],
  punishment: ["sanctioning", "enforcement"],
  punish: ["sanctioning", "enforcement"],
  // AML
  kyc: ["money laundering", "eligibility", "appropriateness", "onboarding"],
  cdd: ["money laundering", "eligibility", "onboarding"],
  // operations
  outsource: ["outsourcing", "material function"],
  vendor: ["outsourcing", "material function"],
  offshore: ["substantive presence"],
  overseas: ["substantive presence"],
  remote: ["substantive presence"],
  // participant relations
  grievance: ["complaints", "disputes"],
  challenge: ["appeal", "decision notice"],
  // applicant journey
  cost: ["fees", "charges"],
  price: ["fees", "charges"],
  charge: ["fees"],
  start: ["application", "authorisation"],
  launch: ["application", "authorisation"],
  establish: ["application", "authorisation"],
  timeline: ["six months", "determine"],
  deadline: ["six months", "28 days"],
  requirement: ["conditions", "fit and proper"],
  criteria: ["conditions", "fit and proper"],
};

/** Multi-word lay phrases (matched against the tokenized query sequence). */
export const PHRASE_SYNONYMS: Array<{ phrase: string; expand: string[] }> = [
  { phrase: "event contract", expand: ["prediction market contract"] },
  { phrase: "binary option", expand: ["prediction market contract"] },
  { phrase: "data feed", expand: ["settlement source"] },
  { phrase: "price feed", expand: ["settlement source"] },
  { phrase: "resolution source", expand: ["settlement source"] },
  { phrase: "insider trading", expand: ["insider dealing"] },
  { phrase: "market abuse", expand: ["market manipulation", "market integrity", "wash trading"] },
  { phrase: "front running", expand: ["market manipulation", "wash trading"] },
  { phrase: "net worth", expand: ["financial resources"] },
  { phrase: "segregated account", expand: ["client money", "segregation", "safeguarding"] },
  { phrase: "customer funds", expand: ["client money", "safeguarding", "participant balances"] },
  { phrase: "shut down", expand: ["suspension", "revocation", "wind down"] },
  { phrase: "strike off", expand: ["suspension", "revocation"] },
  { phrase: "know your customer", expand: ["money laundering", "eligibility", "onboarding"] },
  { phrase: "identity verification", expand: ["money laundering", "eligibility", "onboarding"] },
  { phrase: "third party", expand: ["outsourcing", "material function"] },
  { phrase: "cloud provider", expand: ["outsourcing", "material function"] },
  { phrase: "cross border", expand: ["in or from gibraltar", "substantive presence"] },
  { phrase: "set up", expand: ["application", "authorisation", "operate"] },
  { phrase: "how much", expand: ["fees", "charges"] },
  { phrase: "how long", expand: ["six months", "determine", "28 days"] },
  { phrase: "processing time", expand: ["six months", "determine"] },
  { phrase: "challenge a decision", expand: ["appeal", "supreme court", "decision notice"] },
];
