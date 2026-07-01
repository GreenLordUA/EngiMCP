---
id: ARCH-INITIAL-DECISIONS
kind: decision-log
status: draft
version: 0.1.0
depends_on:
  - DOC-REFERENCES
  - REQ-TECH
---

# Initial Architecture Decisions

This document records the initial decisions made before separate EDR files exist.

## D-001: Markdown-first

**Decision:** the source of truth is Markdown + YAML frontmatter. SQLite is used only as a derived index.

**Why:**

- humans can read documents without MCP;
- Git diff remains understandable;
- the project can be opened in Obsidian/VS Code;
- the index can be deleted and rebuilt.

**Consequences:**

- a frontmatter/headings parser is required;
- section patching must be implemented carefully;
- schemas must be disciplined.

## D-002: MCP stdio in the MVP

**Decision:** the MVP uses MCP stdio transport.

**Why:**

- simpler local integration with agents;
- smaller network attack surface;
- faster to implement.

**Consequences:**

- no remote multi-user mode;
- Streamable HTTP is outside MVP scope.

## D-003: Small Tool Set

**Decision:** do not expose 50 MCP tools in the MVP. The starting set should be compact.

**Why:**

- a large number of tool schemas bloats the client context;
- it is easier for the agent to choose the right tool;
- testing is easier.

**Consequences:**

- some operations are combined into general-purpose tools;
- tool expansion happens after MVP validation.

## D-004: Engineering Decision Record, Not Only ADR

**Decision:** use the term EDR: Engineering Decision Record. ADR remains a specific case.

**Why:**

- a project can span hardware/software/mechanics;
- decisions are not only architectural: material, battery, gearbox, test method.

**Consequences:**

- the template is similar to MADR, but adapted to engineering decisions.

## D-005: Project Graph as a Central Entity

**Decision:** the graph service is a central component, not an add-on feature.

**Why:**

- impact analysis is impossible without a graph;
- context packs should be built from the graph;
- requirements traceability depends on the graph.

**Consequences:**

- all documents/entities must have IDs;
- links must be validated;
- a rebuild/index command will be needed.
