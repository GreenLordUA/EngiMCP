---
id: REQ-TECH
kind: requirements
status: draft
version: 0.1.0
depends_on:
  - DOC-VISION
  - DOC-REFERENCES
impacts:
  - ARCH-SYSTEM
  - MCP-TOOLS
  - DATA-SCHEMA
---

# Full Technical Requirements for EngiMCP

## 1. System Purpose

`EngiMCP` must be an MCP server for managing a local engineering project as a structured Markdown/Git folder. The server must provide an LLM agent with safe tools for reading, searching, relationship analysis, focused editing, and managing engineering entities.

## 2. MVP Scope

### In Scope

- local MCP server execution;
- connection to a single project folder;
- Markdown documents with YAML frontmatter;
- local index;
- document registry;
- requirements;
- ADR/EDR decisions;
- tasks;
- dependency graph;
- impact analysis;
- context pack;
- section-level focused editing;
- project validation;
- audit log;
- basic Git integration.
- safe file and folder operations inside `project_root`.

### Out of Scope

- web UI;
- multi-user mode;
- cloud synchronization;
- full PLM/PDM;
- CAD integration;
- complex approval workflow;
- enterprise permissions;
- vector database as a required dependency;
- automatic CAD/BOM modification without confirmation.

## 3. Functional Requirements

### Project Management

| ID | Requirement | Priority |
|---|---|---:|
| FR-001 | The server must open a project by absolute path to the root directory. | MUST |
| FR-002 | The server must verify that the root contains `project.yaml`, or be able to create it during `project_init`. | MUST |
| FR-003 | The server must restrict all operations to the allowed root directory. | MUST |
| FR-004 | The server must return a project tree with filters by document type. | MUST |
| FR-005 | The server must return a concise project status: number of requirements, decisions, tasks, and validation errors. | MUST |

### Documents

| ID | Requirement | Priority |
|---|---|---:|
| FR-010 | Every managed document must have YAML frontmatter with `id`, `kind`, `status`, and `version`. | MUST |
| FR-011 | The server must read a document by `id`, `path`, or `kind`. | MUST |
| FR-012 | The server must create a document from a template. | MUST |
| FR-013 | The server must update a document section by heading path without rewriting the whole file. | MUST |
| FR-014 | The server must update document frontmatter fields. | MUST |
| FR-015 | The server should preserve Markdown formatting as much as practical. | SHOULD |
| FR-016 | The server should be able to add a backlink/relationship to a document. | SHOULD |
| FR-017 | The server must find documents by tags/frontmatter/kind/status. | MUST |

### Files and Folders

| ID | Requirement | Priority |
|---|---|---:|
| FR-018 | The server must provide a safe project filesystem layer for files and folders. | MUST |
| FR-018.1 | The server must list directories and bounded project trees while respecting deny patterns. | MUST |
| FR-018.2 | The server must read ordinary files with size limits and deny-pattern checks. | MUST |
| FR-018.3 | The server must create and overwrite ordinary files inside `project_root`; overwrite must be explicit. | MUST |
| FR-018.4 | The server must create directories inside `project_root`. | MUST |
| FR-018.5 | The server must move and rename files or folders inside `project_root`. | MUST |
| FR-018.6 | The server must copy files or folders inside `project_root`. | MUST |
| FR-018.7 | The server must delete by moving paths to project trash by default. | MUST |
| FR-018.8 | Filesystem tools must reject `../` traversal, absolute escape paths, symlink escape, and denied paths. | MUST |
| FR-018.9 | Filesystem write-like tools must enforce read-only mode, support dry-run where destructive, and write audit logs. | MUST |
| FR-018.10 | Deleting or moving managed Markdown documents must check incoming/outgoing links and invalidate or refresh derived indexes. | MUST |
| FR-018.11 | `engi_doc_*` tools are canonical for managed engineering documents; `engi_fs_*` tools are canonical for files and folders. | MUST |

### Requirements

| ID | Requirement | Priority |
|---|---|---:|
| FR-020 | The server must create requirements with IDs such as `FR-001`, `NFR-001`, and `SEC-001`. | MUST |
| FR-021 | A requirement must have one of these statuses: `draft`, `proposed`, `accepted`, `implemented`, `verified`, `rejected`, `superseded`. | MUST |
| FR-022 | A requirement should have a rationale field. | SHOULD |
| FR-023 | A requirement must link to decisions, tests, and documents. | MUST |
| FR-024 | The server must show unverified requirements. | MUST |
| FR-025 | The server should show requirements without tests/verification links. | SHOULD |

### Engineering Decisions / ADR / EDR

| ID | Requirement | Priority |
|---|---|---:|
| FR-030 | The server must create a decision record `EDR-0001` from a template. | MUST |
| FR-031 | A decision must include context, options, selected decision, and consequences. | MUST |
| FR-032 | A decision must have one of these statuses: `proposed`, `accepted`, `deprecated`, `superseded`. | MUST |
| FR-033 | A decision must link to affected documents and requirements. | MUST |
| FR-034 | When a meaningful decision changes, the server should recommend creating a new EDR instead of rewriting history. | SHOULD |

### Dependency Graph

| ID | Requirement | Priority |
|---|---|---:|
| FR-040 | The server must build a relationship graph from frontmatter and inline links. | MUST |
| FR-041 | The server must support these relationships: `depends_on`, `impacts`, `satisfies`, `verified_by`, `decided_by`, `supersedes`, `relates_to`. | MUST |
| FR-042 | The server must detect broken relationships. | MUST |
| FR-043 | The server should detect dependency cycles and report them. | SHOULD |
| FR-044 | The server must return a document neighborhood up to N levels deep. | MUST |
| FR-045 | The server must build transitive impact analysis. | MUST |

### Search and Context

| ID | Requirement | Priority |
|---|---|---:|
| FR-050 | The server must support full-text search across the project. | MUST |
| FR-051 | The server must support search by ID, kind, tags, and status. | MUST |
| FR-052 | The server must build a `context_pack` for the user's task. | MUST |
| FR-053 | The `context_pack` must include only relevant documents/sections and explain why each item was included. | MUST |
| FR-054 | The `context_pack` must have a size limit. | MUST |
| FR-055 | The server should return document summaries when available. | SHOULD |

### Tasks

| ID | Requirement | Priority |
|---|---|---:|
| FR-060 | The server must create tasks named `TASK-0001`. | MUST |
| FR-061 | A task must have one of these statuses: `todo`, `in_progress`, `blocked`, `done`, `cancelled`. | MUST |
| FR-062 | A task should link to requirements/documents/decisions. | SHOULD |
| FR-063 | The server could show tasks blocked by changed requirements. | COULD |

### Tests and Verification

| ID | Requirement | Priority |
|---|---|---:|
| FR-070 | The server should support `test_plan` and `test_report` documents. | SHOULD |
| FR-071 | A test should link to the requirements it verifies. | SHOULD |
| FR-072 | The server should show requirements that do not have confirming tests. | SHOULD |
| FR-073 | The server could support a Markdown table for test results. | COULD |

### BOM

| ID | Requirement | Priority |
|---|---|---:|
| FR-080 | The server could support simple BOM documents in Markdown/CSV. | COULD |
| FR-081 | A BOM item should have an ID, name, quantity, status, source, price, and links to assemblies/subsystems. | COULD |
| FR-082 | A requirement change should show potentially affected BOM items through the graph. | COULD |

### Git and Audit

| ID | Requirement | Priority |
|---|---|---:|
| FR-090 | The server should show `git status`. | SHOULD |
| FR-091 | The server must write an audit log for write operations. | MUST |
| FR-092 | Writes must be atomic: temporary file -> validation -> rename. | MUST |
| FR-093 | The server should create a snapshot/backup before bulk changes. | SHOULD |
| FR-094 | The server could create a commit with a message summarizing the changes. | COULD |

## 4. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---:|
| NFR-001 | The system must work locally without a mandatory external API. | MUST |
| NFR-002 | The index must be derived data. Deleting the index must not destroy the project. | MUST |
| NFR-003 | Indexing a project with up to 1000 Markdown files should be fast enough for interactive use. Target: within 10 seconds on a typical laptop. | SHOULD |
| NFR-004 | The `doc_read` operation should respond quickly. Target: under 500 ms for a normal document. | SHOULD |
| NFR-005 | The system should be cross-platform: macOS/Linux minimum. | SHOULD |
| NFR-006 | The document format must be compatible with VS Code and Obsidian. | MUST |
| NFR-007 | Every MCP tool must have an explicit JSON input and output schema. | MUST |
| NFR-008 | Errors must be diagnostic: what is broken, where, and how to fix it. | MUST |
| NFR-009 | The system should minimize context bloat: the MVP should not expose dozens of rarely used tools. | SHOULD |
| NFR-010 | The server must support read-only mode. | MUST |

## 5. Security Requirements

See `docs/08_security/security_model.md`.

Minimum:

| ID | Requirement | Priority |
|---|---|---:|
| SEC-001 | Reading/writing outside the project root directory must be impossible. | MUST |
| SEC-002 | Following symlinks outside the root must be impossible without explicit permission. | MUST |
| SEC-003 | Secrets such as `.env`, SSH keys, and `.git` must be excluded by default. | MUST |
| SEC-004 | Before a write operation, dangerous changes should provide a dry run or diff. | SHOULD |
| SEC-005 | Bulk-write operations should require a clean Git working tree or explicit override confirmation. | SHOULD |
| SEC-006 | Filesystem delete must use project trash by default and must not permanently delete in the MVP. | MUST |

## 6. Versioning

The MVP uses semver:

```text
0.1.x - prototype read/write/index tools
0.2.x - requirements, EDR, impact
0.3.x - context pack, validation, git/status
0.4.x - test reports, BOM-lite
1.0.0 - stable MCP tools contract and document format
```

## 7. Definition of Done for the MVP

The MVP is considered done when:

- a new project can be initialized;
- an existing Markdown project can be opened;
- a requirement, decision, and task can be created;
- a document can be read by ID;
- a section can be updated in place;
- the relationship graph is built;
- `impact_analyze` returns an explainable list of affected documents;
- `validate_project` finds broken links and duplicate IDs;
- all write operations write an audit log;
- there is a test project in `examples/`;
- there are automated tests for key operations.
