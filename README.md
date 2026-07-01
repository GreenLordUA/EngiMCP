---
id: README
kind: overview
status: draft
version: 0.1.0
---

# EngiMCP - Engineering MCP for Long-Running Engineering Projects

**Technical name:** `EngiMCP` / `Engineering Project MCP`.  
**Purpose:** an MCP server that gives an LLM agent controlled, safe, and traceable access to a local engineering project stored in a Markdown/Git repository.

## Core Idea

A basic filesystem MCP can read and write files. `EngiMCP` should understand not only files, but **engineering entities**:

- requirements;
- engineering decisions / ADR / EDR;
- calculations;
- subsystem specifications;
- tests;
- tasks;
- BOM;
- relationships between documents;
- change impact.

The goal is to give documentation roughly the same working model that Codex provides for code:

```text
the user says: "we are changing the battery"
EngiMCP finds related documents
the agent reads only the required context
the agent proposes changes
EngiMCP applies focused edits
EngiMCP updates the decision log, tasks, and index
Git records the history
```

## Why This Is Needed

A long-running engineering project cannot live only in chat. After a month, context is lost, decisions are forgotten, requirements drift away from calculations, and documents become inconsistent.

Codex solves a different problem well: it can inspect and change a code repository. Engineering documentation needs an additional layer. The agent must understand requirements, decisions, tests, BOM items, calculations, and the relationships between them. A plain repository view does not tell the agent which requirement is verified by which test, which EDR explains a design choice, or which documents become stale after changing a battery, motor, material, interface, or safety constraint.

The source of truth should live in the project folder, but it must be exposed as an engineering model, not just as files. `EngiMCP` gives the agent structured access to that model: IDs, frontmatter, links, dependency graph, impact analysis, validation, and safe focused writes.

## MVP Goals

The MVP should be able to:

1. Initialize a project structure.
2. Read documents by logical ID, not only by path.
3. Create and update Markdown documents with YAML frontmatter.
4. Manage requirements, decisions, tasks, and a change log.
5. Build a dependency graph between documents.
6. Run impact analysis: what a change will affect.
7. Build a compact context pack for an LLM.
8. Validate the project: broken links, duplicate IDs, missing required fields.
9. Run locally without sending data outside the machine.
10. Work on top of Git without breaking a manual workflow.

## Documentation Map

- `docs/00_overview/product_vision.md` - product vision.
- `docs/01_research/reference_projects.md` - reference projects.
- `docs/02_requirements/technical_requirements.md` - full technical requirements.
- `docs/02_requirements/acceptance_criteria.md` - acceptance criteria.
- `docs/03_architecture/system_architecture.md` - system architecture.
- `docs/04_data_model/entities_and_schema.md` - data model.
- `docs/05_mcp_interface/tools_spec.md` - MCP tools.
- `docs/06_workflows/workflows.md` - workflows.
- `docs/07_quality/testing_strategy.md` - testing strategy.
- `docs/08_security/security_model.md` - security.
- `docs/09_delivery/roadmap.md` - implementation roadmap.

## Implementation Stack

The MVP implementation stack:

```text
Language: TypeScript
Transport: MCP stdio for the MVP
Storage: Markdown + YAML frontmatter + local SQLite index
Search: ripgrep/full-text in the MVP; embeddings are outside MVP scope
Git: shell out to git CLI or use a library
Client: Codex / Claude Code / any MCP-compatible client
```

## License

MIT License.
