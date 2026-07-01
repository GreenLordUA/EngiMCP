---
id: DOC-REFERENCES
kind: research
status: draft
version: 0.1.0
---

# Reference Projects and What to Borrow

This document records which existing projects should inform the design of `EngiMCP`.

## 1. Model Context Protocol

The official MCP defines the baseline model for connecting LLM applications to external data, tools, and workflows. Three primitives matter for this project:

- **Tools** - actions the model can call: read, search, impact analysis, write.
- **Resources** - project data that the client can include in context.
- **Prompts** - predefined working scenarios.

Sources:

- https://modelcontextprotocol.io/docs/getting-started/intro
- https://modelcontextprotocol.io/specification/2025-06-18/server/tools

What to borrow:

```text
- strict JSON schemas for tools;
- clear tool descriptions;
- separation between read and write operations;
- prompts for repeatable workflows;
- resources for frequently used project views.
```

## 2. ContextGit

ContextGit is described as a local-first, git-friendly CLI for bidirectional traceability between business requirements, system specifications, architecture decisions, source code, and tests.

Source:

- https://github.com/Mohamedsaleh14/ContextGit

What to borrow:

```text
- local-first approach;
- Git as natural history;
- traceability as a central feature;
- impact analysis;
- staleness detection;
- exact context extraction for LLMs.
```

What is missing for this project:

```text
- hardware entities: subsystem, calculation, BOM, test;
- a human-friendly Markdown structure tailored to engineering documentation;
- specialized workflows for hardware/R&D.
```

## 3. Lifecycle MCP

Lifecycle MCP is an MCP server for project lifecycle management: requirements, tasks, architecture decisions, traceability, SQLite storage, and dashboards.

Source:

- https://github.com/heffrey78/lifecycle-mcp

What to borrow:

```text
- requirements/tasks/ADR as primary entities;
- relationships between entities;
- lifecycle state;
- documentation export;
- dashboard/status summary.
```

Risk:

```text
- SQLite-first storage can conflict with Markdown-first as the source of truth.
```

## 4. ConPort / Context Portal

ConPort is a database-backed MCP memory bank for structured project context, active context, decisions, progress, links, and custom data.

Source:

- https://github.com/GreatScottyMac/context-portal

What to borrow:

```text
- project memory;
- active context;
- decision logging;
- progress tracking;
- explicit links between entities;
- recent activity.
```

## 5. Basic Memory

Basic Memory stores knowledge in structured Markdown files and builds a local knowledge graph.

Sources:

- https://github.com/basicmachines-co/basic-memory
- https://docs.basicmemory.com/

What to borrow:

```text
- Markdown as source;
- humans and LLMs write to the same files;
- semantic graph over plain files;
- compatibility with Obsidian/VS Code;
- local SQLite index as a derived layer.
```

## 6. Memory Bank MCP

Memory Bank MCP supports structured project Markdown documents: goals, decisions, progress, patterns, and active context.

Sources:

- https://github.com/tuncer-byte/memory-bank-MCP
- https://mcp.aibase.com/server/1473079475607707688

What to borrow:

```text
- minimal set of project memory documents;
- active context;
- progress.md;
- decision-log.md;
- system-patterns.md.
```

## 7. Obsidian MCP

Obsidian MCP servers can read, search, and apply focused edits to a Markdown vault, including frontmatter, tags, backlinks, graph traversal, and patch by section.

Sources:

- https://github.com/cyanheads/obsidian-mcp-server
- https://github.com/lstpsche/obsidian-mcp

What to borrow:

```text
- section-level patching;
- frontmatter-aware operations;
- backlinks;
- graph traversal;
- tag/frontmatter filters;
- no dependency on a running Obsidian app.
```

## 8. ADR / MADR

An ADR records an important decision with its context and consequences. MADR is a Markdown template for such records.

Sources:

- https://adr.github.io/
- https://github.com/architecture-decision-record/architecture-decision-record
- https://github.com/adr/madr

What to borrow:

```text
- decision as a separate document;
- decision status;
- context;
- considered options;
- consequences;
- links to requirements and documents.
```

## Summary

`EngiMCP` should not start from a blank slate conceptually. It should combine the strongest ideas:

```text
ContextGit     -> traceability, impact, git-first
Lifecycle MCP  -> requirements/tasks/ADR lifecycle
ConPort        -> project memory and explicit links
Basic Memory   -> Markdown graph, local-first
Memory Bank    -> active context and progress docs
Obsidian MCP   -> patch sections, frontmatter, backlinks
ADR/MADR       -> disciplined decision records
```
