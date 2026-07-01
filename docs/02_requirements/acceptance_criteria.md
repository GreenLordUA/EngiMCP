---
id: REQ-ACCEPTANCE
kind: acceptance
status: draft
version: 0.1.0
depends_on:
  - REQ-TECH
---

# EngiMCP Acceptance Criteria

## Acceptance Levels

- **MVP-A** - minimally useful tool for one project.
- **MVP-B** - practical for real Codex/LLM-assisted work.
- **v1.0** - stable project format and MCP contract.

## MVP-A: Required Acceptance

| ID | Check | Expected Result |
|---|---|---|
| AC-001 | Start the server on an empty folder and call `project_init`. | Project structure, `project.yaml`, base docs, and templates are created. |
| AC-002 | Call `project_status`. | Project status is returned without errors. |
| AC-003 | Create requirement `FR-001`. | A Markdown document or a record in the requirements file is created with the correct ID. |
| AC-004 | Create an EDR. | File `docs/decisions/EDR-0001-*.md` is created from the template. |
| AC-005 | Read a document by ID. | Content, frontmatter, headings, and outgoing links are returned. |
| AC-006 | Replace a document section. | Only the target section changes; the rest is preserved. |
| AC-007 | Build the graph. | Nodes/edges are returned, and documents are linked by frontmatter. |
| AC-008 | Delete a target document and run validation. | The validator finds a broken link. |
| AC-009 | Create two documents with the same ID and run validation. | The validator finds a duplicate ID. |
| AC-010 | Run `impact_analyze` for a document. | A list of direct and transitive dependencies is returned with reasons. |
| AC-011 | Start read-only mode and try to run a write tool. | The operation is rejected. |
| AC-012 | Check the audit log after a write operation. | The log contains timestamp, tool, target, and diff summary. |
| AC-013 | Call `engi_fs_tree` on a project containing `.git`, `.env`, and cache paths. | Denied paths are excluded. |
| AC-014 | Call `engi_fs_write` with `mode="create_new"`. | A new ordinary file is created; a repeated call fails with `ALREADY_EXISTS`. |
| AC-015 | Call `engi_fs_mkdir`. | The directory is created inside root and audit log is written. |
| AC-016 | Call `engi_fs_delete` with default settings. | The target is moved to `.engimcp/trash/YYYY-MM-DD/<original-path>`. |
| AC-017 | Try path traversal or symlink escape through an `engi_fs_*` tool. | The operation is rejected. |
| AC-018 | Delete a managed document with incoming links. | The operation is rejected unless `force=true`. |

## MVP-B: LLM Usefulness Acceptance

| ID | Check | Expected Result |
|---|---|---|
| AC-020 | Request: "we are changing the project motors". | `context_pack` includes requirements, motors, battery, transmission, decisions, and calculations. |
| AC-021 | Request: "what breaks if we change the battery?" | `impact_analyze` returns power, BOM, requirements, tests, and related EDRs. |
| AC-022 | Request: "create a decision for choosing Markdown-first". | An EDR is created with correct fields and links. |
| AC-023 | Request: "find unverified requirements". | Requirements without `verified_by` are returned. |
| AC-024 | Request: "prepare context for a Codex task". | A compact pack with relevant files and instructions is returned. |
| AC-025 | The agent updates a document. | The change is visible in Git diff and easy for a human to review. |

## v1.0: Stability

| ID | Check | Expected Result |
|---|---|---|
| AC-100 | Backward compatibility from project schema 0.x to 1.0. | A migration or clear error is available. |
| AC-101 | 1000 Markdown documents. | Indexing and search remain interactive. |
| AC-102 | Corrupt frontmatter. | The server does not crash and returns a diagnostic error. |
| AC-103 | Git conflict. | The server does not overwrite conflicting changes. |
| AC-104 | Server restart. | The index is restored and the project opens. |
| AC-105 | Tool documentation. | Every tool is documented, tested, and has schema examples. |

## Acceptance Rejection Criteria

The MVP is not accepted if:

- a write operation can escape the project root;
- a filesystem operation can escape the project root;
- a tool can accidentally rewrite a whole file without diff/backup;
- delete permanently removes files by default instead of using project trash;
- the project cannot be recovered after deleting the index;
- write operations have no tests;
- ID and broken-link validation is missing;
- the agent must read the whole project for a simple change;
- changes are not reviewable in Git diff.
