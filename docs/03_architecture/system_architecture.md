---
id: ARCH-SYSTEM
kind: architecture
status: draft
version: 0.1.0
depends_on:
  - REQ-TECH
impacts:
  - DATA-SCHEMA
  - MCP-TOOLS
---

# EngiMCP System Architecture

## High-Level Diagram

```text
MCP Client / Codex / Claude Code
        |
        | MCP stdio/http
        v
EngiMCP Server
        |
        +-- Tool Layer
        +-- Project Service
        +-- Document Service
        +-- Graph Service
        +-- Requirements Service
        +-- Decision Service
        +-- Search Service
        +-- Context Pack Service
        +-- Validation Service
        +-- Audit Service
        +-- Git Adapter
        |
        v
Project Folder
        +-- Markdown docs
        +-- project.yaml
        +-- templates
        +-- examples
        +-- .git
        +-- .engimcp/index.sqlite
```

## Components

### 1. MCP Server Layer

Responsible for:

- registering tools/resources/prompts;
- validating JSON schemas;
- returning errors in MCP format;
- stdio transport for the MVP;
- Streamable HTTP outside MVP scope.

### 2. Project Service

Responsible for:

- opening a project;
- reading `project.yaml`;
- allowed paths;
- document type configuration;
- project status;
- lifecycle command `project_init`.

### 3. Document Service

Responsible for:

- Markdown parsing;
- YAML frontmatter;
- headings map;
- document reading;
- creation from template;
- section patching;
- frontmatter patching;
- atomic writes.

### 4. Graph Service

Responsible for:

- collecting document IDs;
- collecting frontmatter relationships;
- collecting wiki-links/inline links;
- building the graph;
- neighborhood queries;
- impact analysis;
- detecting broken links/cycles.

### 5. Requirements Service

Responsible for:

- creating requirements;
- requirement statuses;
- links to decisions, tests, and tasks;
- reports: unverified, orphaned, stale.

### 6. Decision Service

Responsible for:

- creating EDR/ADR records;
- decision statuses;
- superseding;
- decision log;
- links to requirements/docs/tasks.

### 7. Search Service

MVP:

- full-text via file search / ripgrep / SQLite FTS;
- search by frontmatter;
- search by ID.

Later:

- embeddings;
- semantic search;
- concept extraction.

### 8. Context Pack Service

Builds a compact context set for an LLM:

```text
- user task;
- relevant requirements;
- documents;
- decisions;
- open tasks;
- risks;
- inclusion reasons;
- incompleteness warnings.
```

### 9. Validation Service

Checks:

- ID uniqueness;
- required frontmatter fields;
- broken relationships;
- invalid statuses;
- missing verification for accepted/implemented requirements;
- inconsistent versions/statuses.

### 10. Audit Service

Writes a local audit log:

```text
timestamp
tool
actor/client
targets
operation
diff summary
success/error
```

### 11. Git Adapter

Minimal MVP:

- `git status`;
- dirty tree check;
- diff summary.

Later:

- commit;
- branch;
- tag;
- changelog.

## Storage

### Source of Truth

The source of truth is Markdown files and `project.yaml`.

### Index

`.engimcp/index.sqlite` is a derived index. It can be deleted and rebuilt.

The index stores:

- documents;
- headings;
- relations;
- requirements;
- decisions;
- tasks;
- search index;
- validation cache.

## Markdown-First vs SQLite-First

MVP decision: **Markdown-first + SQLite index**.

Reasons:

- documents are readable by humans;
- Git diff remains useful;
- the project does not depend on a running server;
- Obsidian/VS Code compatibility;
- the index can be rebuilt.

SQLite is needed for performance and queries, but it must not become the only source of truth.

## Errors and Failure Modes

If the index is corrupt:

```text
the server suggests rebuild_index
project files are not damaged
```

If Markdown is corrupt:

```text
the server returns a diagnostic error
write operations against the file are blocked until it is fixed
```

If Git is dirty:

```text
dangerous bulk-write operations are blocked or require explicit override
```
