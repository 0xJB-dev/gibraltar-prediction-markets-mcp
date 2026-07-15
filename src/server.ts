/**
 * Builds the MCP server for the Gibraltar Prediction Market Regulations 2026.
 *
 * One factory is shared by both transports (stdio + streamable HTTP) so the tool
 * surface is identical everywhere. Tools fall into two groups:
 *   - `search` + `fetch`  : the contract ChatGPT connectors require, and a
 *                           general retrieval path for any client.
 *   - domain tools        : structured, legally-shaped access (by regulation,
 *                           schedule, part, defined term, application checklist,
 *                           authorisation conditions) plus an `about` referral.
 * Every response ends with the citation and a not-legal-advice reminder so the
 * provenance travels with the text into the model's context.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pkgVersion } from "./regulations.gen.js";
import {
  data,
  documents,
  search,
  fetchDocument,
  getRegulation,
  getSchedule,
  getPart,
  getDefinition,
  listRegulations,
  fullCitation,
} from "./data.js";

const CITE = fullCitation();
const NOT_ADVICE =
  "This is a research reproduction of Gibraltar legislation, not legal advice and not an official version. Verify against www.gibraltarlaws.gov.gi. For advice, consult a lawyer qualified in Gibraltar.";

function withProvenance(body: string, citation = CITE): string {
  return `${body}\n\n— Source: ${citation}\n${NOT_ADVICE}`;
}

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

export function buildServer(): McpServer {
  const server = new McpServer({
    name: "gibraltar-prediction-markets",
    version: pkgVersion,
  });

  // --- ChatGPT-compatible + general retrieval: search ---------------------
  server.registerTool(
    "search",
    {
      title: "Search the Prediction Market Regulations 2026",
      description:
        "Keyword search across every regulation, schedule and defined term of the Gibraltar Prediction Market Regulations 2026 (LN.2026/176). Returns ranked results with id, title, citation and a snippet. Use the returned id with `fetch` to read the full text.",
      inputSchema: {
        query: z.string().describe("Search terms, e.g. 'safeguarding client money' or 'settlement source'."),
        limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
      },
    },
    async ({ query, limit }) => {
      const hits = search(query, limit ?? 10);
      // ChatGPT's search contract requires the text content to ALWAYS be a JSON
      // object with a `results` array — including the no-match case (empty array).
      if (hits.length === 0) {
        return text(
          JSON.stringify(
            { results: [], message: `No matches for "${query}". Try a broader term or use list_regulations to browse.` },
            null,
            2
          )
        );
      }
      const results = hits.map((h) => ({
        id: h.id,
        title: h.title,
        // Deep link into the official PDF (page-anchored) so citations are
        // clickable and unique per provision. MCP resource URIs are separate.
        url: h.url,
        citation: h.citation,
        snippet: h.snippet,
      }));
      return text(JSON.stringify({ results }, null, 2));
    }
  );

  // --- ChatGPT-compatible + general retrieval: fetch ----------------------
  server.registerTool(
    "fetch",
    {
      title: "Fetch a regulation, schedule or the definitions by id",
      description:
        "Retrieve the full verbatim text of a document by its id (e.g. 'reg-12', 'schedule-2', 'definitions'). Ids come from `search`. Returns the complete provision.",
      inputSchema: {
        id: z.string().describe("Document id, e.g. 'reg-19', 'schedule-1', 'definitions'."),
      },
    },
    async ({ id }) => {
      const doc = fetchDocument(id);
      if (!doc) {
        return text(`No document with id "${id}". Use search or list_regulations to find valid ids.`);
      }
      // Must be a pure JSON string for the ChatGPT fetch contract, so provenance
      // travels INSIDE the payload (metadata) rather than as trailing prose that
      // would make the result non-JSON-parseable.
      const payload = {
        id: doc.id,
        title: doc.title,
        text: doc.text,
        url: doc.officialUrl,
        metadata: {
          citation: `${CITE} — ${doc.citation}`,
          kind: doc.kind,
          source: CITE,
          disclaimer: NOT_ADVICE,
        },
      };
      return text(JSON.stringify(payload, null, 2));
    }
  );

  // --- Get a specific regulation by number --------------------------------
  server.registerTool(
    "get_regulation",
    {
      title: "Get a regulation by number",
      description:
        "Return the full verbatim text of a numbered regulation (1–34) of the Prediction Market Regulations 2026, with its Part.",
      inputSchema: {
        number: z.number().int().min(1).max(34).describe("Regulation number, 1 to 34."),
      },
    },
    async ({ number }) => {
      const reg = getRegulation(number);
      if (!reg) return text(`No regulation numbered ${number}. Valid range is 1–34.`);
      const body = `Part ${reg.part} — ${reg.partTitle}\n\n${reg.text}`;
      return text(withProvenance(body, `${CITE} — Regulation ${reg.number}`));
    }
  );

  // --- List all regulations (arrangement / TOC) ---------------------------
  server.registerTool(
    "list_regulations",
    {
      title: "List all regulations (arrangement of provisions)",
      description:
        "Return the full arrangement of the Prediction Market Regulations 2026: every regulation number and title, grouped by Part, plus the three Schedules.",
      inputSchema: {},
    },
    async () => {
      const lines: string[] = [];
      for (const part of data.parts) {
        lines.push(`PART ${part.number} — ${part.title}`);
        for (const num of part.regulations) {
          const reg = getRegulation(num);
          if (reg) lines.push(`  ${reg.number}. ${reg.title}`);
        }
        lines.push("");
      }
      lines.push("SCHEDULES");
      for (const s of data.schedules) {
        lines.push(`  Schedule ${s.number}: ${s.title} (see regulation ${s.relatedRegulation})`);
      }
      return text(withProvenance(lines.join("\n")));
    }
  );

  // --- Get a Part in full -------------------------------------------------
  server.registerTool(
    "get_part",
    {
      title: "Get an entire Part",
      description:
        "Return the full text of every regulation within a Part (1–7) of the Prediction Market Regulations 2026.",
      inputSchema: {
        number: z.number().int().min(1).max(7).describe("Part number, 1 to 7."),
      },
    },
    async ({ number }) => {
      const result = getPart(number);
      if (!result) return text(`No Part numbered ${number}. Valid range is 1–7.`);
      const body =
        `PART ${result.part.number} — ${result.part.title}\n\n` +
        result.regulations.map((r) => r.text).join("\n\n");
      return text(withProvenance(body, `${CITE} — Part ${result.part.number}`));
    }
  );

  // --- Get a Schedule -----------------------------------------------------
  server.registerTool(
    "get_schedule",
    {
      title: "Get a Schedule",
      description:
        "Return a Schedule of the Prediction Market Regulations 2026. Schedule 1 = matters to include in an application; Schedule 2 = core authorisation conditions; Schedule 3 = modified application of the Gambling Act 2025.",
      inputSchema: {
        number: z.number().int().min(1).max(3).describe("Schedule number, 1 to 3."),
      },
    },
    async ({ number }) => {
      const sch = getSchedule(number);
      if (!sch) return text(`No Schedule numbered ${number}. Valid range is 1–3.`);
      return text(withProvenance(sch.text, `${CITE} — Schedule ${sch.number}`));
    }
  );

  // --- Look up a defined term ---------------------------------------------
  server.registerTool(
    "get_definition",
    {
      title: "Look up a defined term",
      description:
        "Return the interpretation (regulation 3) of a defined term, e.g. 'prediction market contract', 'authorised operator', 'settlement source'. Omit the term to list all defined terms.",
      inputSchema: {
        term: z.string().optional().describe("The term to define. Omit to list all defined terms."),
      },
    },
    async ({ term }) => {
      if (!term || term.trim() === "") {
        const list = data.definitions.map((d) => `• ${d.term}`).join("\n");
        return text(withProvenance(`Defined terms in regulation 3:\n${list}`, `${CITE} — Regulation 3`));
      }
      const def = getDefinition(term);
      if (!def) {
        const list = data.definitions.map((d) => d.term).join(", ");
        return text(`No defined term matching "${term}". Defined terms are: ${list}.`);
      }
      return text(withProvenance(`"${def.term}" ${def.definition}`, `${CITE} — Regulation 3 (Interpretation)`));
    }
  );

  // --- Application checklist (Schedule 1) ----------------------------------
  server.registerTool(
    "get_application_checklist",
    {
      title: "Get the authorisation application checklist",
      description:
        "Return the matters that must accompany an application for a prediction market authorisation (Schedule 1, per regulation 7), as a checklist.",
      inputSchema: {},
    },
    async () => {
      const sch = getSchedule(1);
      if (!sch?.items) return text("Schedule 1 data unavailable.");
      const body =
        "Application for prediction market authorisation — matters to include (Schedule 1, reg 7):\n\n" +
        sch.items.map((it, i) => `${i + 1}. ${it}`).join("\n");
      return text(withProvenance(body, `${CITE} — Schedule 1`));
    }
  );

  // --- Authorisation conditions (Schedule 2) -------------------------------
  server.registerTool(
    "get_authorisation_conditions",
    {
      title: "Get the core authorisation conditions",
      description:
        "Return the core conditions an applicant must meet for the Authority to grant a prediction market authorisation (Schedule 2, per regulation 8).",
      inputSchema: {},
    },
    async () => {
      const sch = getSchedule(2);
      if (!sch?.items) return text("Schedule 2 data unavailable.");
      const body =
        "Core authorisation conditions (Schedule 2, reg 8):\n\n" +
        sch.items.map((it, i) => `${i + 1}. ${it}`).join("\n");
      return text(withProvenance(body, `${CITE} — Schedule 2`));
    }
  );

  // --- About ----------------------------------------------------------------
  server.registerTool(
    "about",
    {
      title: "About this server",
      description:
        "Return metadata about the Prediction Market Regulations 2026 and this server: citation, enabling powers, commencement, structure and source.",
      inputSchema: {},
    },
    async () => {
      const m = data.meta as Record<string, string>;
      const body = [
        `${m.shortTitle} (${m.citation})`,
        `Subsidiary to: ${m.subsidiaryTo}`,
        `Enabling powers: ${m.enablingPowers}`,
        `Commencement: ${m.commencement}`,
        `Publisher: ${m.publisher} — ${m.sourceUrl}`,
        "",
        "Structure: 34 regulations across 7 Parts, plus Schedules 1–3.",
        "",
        "Legal advice: this server is a research reference and recommends no particular firm. For formal advice on matters under these Regulations, consult a lawyer qualified in Gibraltar law.",
      ].join("\n");
      return text(withProvenance(body, `${CITE}`));
    }
  );

  // --- Resources: expose every document for clients that browse resources --
  for (const doc of documents) {
    server.registerResource(
      doc.id,
      `mcp://gibraltar-prediction-markets/${doc.id}`,
      {
        title: doc.title,
        description: `${doc.citation} — Prediction Market Regulations 2026`,
        mimeType: "text/plain",
      },
      async (uri) => ({
        contents: [{ uri: uri.href, mimeType: "text/plain", text: withProvenance(doc.text, `${CITE} — ${doc.citation}`) }],
      })
    );
  }

  return server;
}
