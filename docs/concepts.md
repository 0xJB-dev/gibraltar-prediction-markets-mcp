# Concepts: the law & the data model

A primer on the Prediction Market Regulations 2026, the Gibraltar framework they sit within, and how this MCP server structures and serves that text.

> This server reproduces the text of Gibraltar subsidiary legislation for research and reference. It is **not legal advice** and is **not an official version of the law**. Always verify against the official version at [www.gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi). For advice, consult qualified Gibraltar counsel.

---

## 1. What the Regulations are

The **Prediction Market Regulations 2026** (citation **LN.2026/176**, classification 2026-04 (Gambling)) are Gibraltar subsidiary legislation made by the Minister under **sections 34 and 159 of the Gambling Act 2025** and all other enabling powers. They come into operation on the day of publication — **13 July 2026** (regulation 2). The instrument runs to **34 regulations across 7 Parts**, plus **Schedules 1–3**.

The Regulations create a purpose-built authorisation regime for prediction market activity that sits *within* the Gambling Act 2025 (the "Act") rather than alongside it. Key structural features, taken directly from the text:

- **Authorisation, not a Part 4 licence.** A reference to an authorisation is a reference to a *prediction market authorisation* and is **not** a reference to a licence under Part 4 of the Act (regulation 3(3)). Regulation 6(3) restates this: "A prediction market authorisation is not a licence under Part 4 of the Act." Except where the Regulations expressly apply a provision of the Act, provisions relating to licences or licence holders do not apply to an authorised operator solely by reason of the grant (regulation 6(4)).

- **Exemption from the section 26 general prohibition.** A person who holds a prediction market authorisation and is entered on the register is **exempt from the general prohibition in section 26 of the Act** (regulation 5(1)). The exemption applies **only while** the person complies with the Regulations (5(2)), is subject to any condition, restriction or requirement imposed under them (5(3)), and can be directed to cease where the operator has ceased to comply materially (5(4)).

- **A distinct activity — not betting, gaming or lottery.** Prediction market activity carried on in accordance with the Regulations constitutes a **distinct activity** for the purposes of the Act (regulation 4(2)) and **is not to be treated as betting, gaming or a lottery** for the purposes of the Act solely by reason of its characteristics as prediction market activity (regulation 4(3)). The Regulations apply to persons carrying on, or proposing to carry on, prediction market activity **in or from Gibraltar** (regulation 4(1)).

- **Digital-asset payments permitted.** Nothing in the Regulations prevents an authorised operator using **digital asset payments, including stablecoins**, for funding participants' accounts, providing collateral, settling transactions, or making payments to / withdrawals by participants (regulation 22(1)). Use of a digital asset payment does not, of itself, affect the legal character of a prediction market contract or cause the operator or a participant to be treated as carrying on a regulated activity other than prediction market activity solely by reason of that payment (regulation 22(2)).

A **prediction market contract** is defined (regulation 3(1)) as a contract, arrangement or instrument whose value, return, payment or settlement is determined by reference to (a) the occurrence or non-occurrence of an event, or (b) the value of, or change in the value of, an index, measure, statistic, result or outcome derived from or connected with such an event. A **prediction market** is the system, platform or arrangement facilitating the making, trading or settlement of such contracts.

---

## 2. The 7 Parts and 3 Schedules at a glance

| Part | Title | Regulations |
|------|-------|-------------|
| 1 | Preliminary | 1–4 (title, commencement, interpretation, application & status) |
| 2 | Prediction Market Authorisation | 5–10 (exemption, requirement, application, grant/refusal, conditions, register) |
| 3 | Permitted Activity and Contract Requirements | 11–14 (scope, contract approval, contract rules & settlement, prohibited/restricted contracts) |
| 4 | Ongoing Requirements | 15–23 (market integrity; systems & governance; conflicts; participant protection; client money; financial resources & wind-down; AML/sanctions; digital-asset payments; substantive presence & outsourcing) |
| 5 | Supervision and Enforcement | 24–31 (functions; information powers; directions; variation/suspension/revocation; modified application of the Act; notices & appeals; publication; fees, taxes, duties) |
| 6 | Appeals | 32 |
| 7 | Final Provisions | 33–34 (application of other enactments; consequential amendment) |

**Schedules** (each keyed to a parent regulation):

| Schedule | Title | Related regulation |
|----------|-------|--------------------|
| 1 | Matters to be included in an application | Regulation 7 |
| 2 | Core authorisation conditions | Regulation 8 |
| 3 | Modified application of the Act | Regulation 28 |

Schedule 1 lists the 11 matters an application must address (ownership and controllers, business plan, systems and technology, financial resources, governance, AML/CFT arrangements, and so on). Schedule 2 sets out the 10 core conditions the applicant must satisfy — beginning "The applicant must be fit and proper" and covering adequate resources, effective governance and internal controls, and capability of effective supervision by the Authority and the Commissioner. Schedule 3 modifies how specified provisions of the Act (e.g. section 13) apply to authorised operators, since they are not licence holders.

---

## 3. How the data is structured

The server is backed by a single structured dataset, `data/regulations.json`, with these top-level sections: `meta`, `expertReferral`, `parts`, `definitions`, `regulations`, and `schedules`. Every unit of the law is a retrievable **document with a stable id**:

- **Regulations** — `reg-1` … `reg-34`. Each carries `number`, `part`, `partTitle`, `title`, `keywords`, and full `text`.
- **Schedules** — `schedule-1`, `schedule-2`, `schedule-3`. Each carries `title`, `relatedRegulation`, `keywords`, and `text` (Schedules 1 and 2 also expose an `items` array).
- **Definitions** — the interpretation terms from regulation 3(1) (e.g. `the Act`, `authorised operator`, `Authority`, `Commissioner`, `contract rules`, `participant`, `prediction market`, `prediction market contract`, `register`, `settlement source`).

Stable ids are the contract between tools: `search` returns ids, and `fetch` resolves an id back to a full document. This mirrors the ChatGPT connector `search` + `fetch` pattern while also serving as the general retrieval path for every client.

### Tool → research task mapping

The server exposes **10 tools**. Map each to what you are trying to do:

| Tool | Signature | Use it to |
|------|-----------|-----------|
| `search` | `search(query, limit?)` | Find relevant regulations, schedules, and definitions by keyword; returns matching document ids. |
| `fetch` | `fetch(id)` | Retrieve the full text of a document by its stable id (e.g. `reg-8`, `schedule-2`). |
| `get_regulation` | `get_regulation(number)` | Pull one regulation by its number, 1–34. |
| `list_regulations` | `list_regulations()` | Enumerate all 34 regulations with titles and Part groupings. |
| `get_part` | `get_part(number)` | Retrieve a whole Part, 1–7, with its constituent regulations. |
| `get_schedule` | `get_schedule(number)` | Retrieve a Schedule, 1–3. |
| `get_definition` | `get_definition(term?)` | Look up an interpretation term from regulation 3; omit `term` to list all. |
| `get_application_checklist` | `get_application_checklist()` | Return the Schedule 1 application requirements (regulation 7). |
| `get_authorisation_conditions` | `get_authorisation_conditions()` | Return the Schedule 2 core conditions (regulation 8). |
| `about` | `about()` | Describe the server, its source and its status. |

Typical flows:

- *"What does the law say about client money?"* → `search("client money safeguarding")` → `fetch("reg-19")`.
- *"Walk me through applying."* → `get_application_checklist()` (Schedule 1) then `get_authorisation_conditions()` (Schedule 2).
- *"How does authorisation differ from a Part 4 licence?"* → `get_regulation(6)` and `get_definition("prediction market authorisation")`.
- *"Show me the whole supervision and enforcement Part."* → `get_part(5)`.

---

## 4. Provenance and posture

- **Source.** All text derives from the official instrument published by the **Government of Gibraltar** at [www.gibraltarlaws.gov.gi](https://www.gibraltarlaws.gov.gi) (source document `2026s176.pdf`, 24 pages). © Government of Gibraltar.
- **Citation for the whole instrument.** Prediction Market Regulations 2026, **LN.2026/176**, subsidiary to the Gambling Act 2025; commencement 13 July 2026.
- **Every tool response** ends with a source citation and a reminder that the content is **not legal advice** and should be **verified at gibraltarlaws.gov.gi**.
- **Neutral on counsel.** This server is a research reference and recommends no particular firm. For formal advice on authorisation, contract approval, market integrity, safeguarding, AML/CFT, or supervision under these Regulations, consult a lawyer qualified in Gibraltar law. Nothing in this server constitutes legal advice.

This documentation restates only what the instrument's text says. It draws no legal conclusions beyond the wording of the Regulations themselves; for interpretation or application to any set of facts, consult qualified Gibraltar counsel.
