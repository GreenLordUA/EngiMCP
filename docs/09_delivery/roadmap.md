---
id: DOC-ROADMAP
kind: roadmap
status: draft
version: 0.1.0
---

# EngiMCP Implementation Roadmap

## Milestone 0 - Repository Setup

Status: complete.

Goal: create the project skeleton.

Tasks:

- create a TypeScript MCP server skeleton;
- add README, license, AGENTS.md;
- add a test project fixture;
- configure formatter/linter/tests;
- configure CI locally or through GitHub Actions.

Done when:

- the server starts;
- an MCP client lists `engi_project_status`;
- tests run.

## Milestone 1 - Markdown Project Core

Status: complete.

Goal: read and index the project.

Tasks:

- project.yaml parser;
- safe path resolver;
- Markdown file discovery;
- YAML frontmatter parser;
- headings parser;
- document registry;
- SQLite index;
- basic `project_map`, `doc_read`, and `validate_project`.

Done when:

- the test project is indexed;
- reading by ID works;
- duplicate IDs and broken frontmatter are detected.

## Milestone 2 - Safe Writes

Status: complete.

Goal: modify documents safely.

Tasks:

- atomic write;
- section patch;
- frontmatter patch;
- doc_create from template;
- audit log;
- dry-run;
- write safety tests.

Done when:

- an EDR can be created;
- a section can be replaced;
- Git diff is readable;
- all safety tests pass.

## Milestone 3 - Graph and Impact

Status: complete.

Goal: relationships and consequences.

Tasks:

- relation extraction from frontmatter;
- optional relation extraction from wiki-links;
- graph_query;
- impact_analyze;
- cycles/broken links validation;
- reasons for impact.

Done when:

- changing battery -> power/motors/BOM works in the test project;
- every result has a reason.

## Milestone 4 - Requirements, EDR, Tasks

Status: complete.

Goal: engineering entities.

Tasks:

- requirement_create;
- decision_create;
- task_create;
- templates;
- statuses;
- reports: unverified requirements, open tasks.

Done when:

- a mini-project can be managed without creating files manually.

## Milestone 5 - Context Pack

Status: complete.

Goal: give the LLM relevant context.

Tasks:

- context pack ranking;
- token budget approximation;
- include/exclude reasons;
- seed IDs;
- validation warnings;
- golden tests.

Done when:

- for common tasks, the pack contains the right documents and does not bloat.

## Milestone 6 - Git Integration

Status: complete.

Goal: safe work on top of Git.

Tasks:

- git_status;
- dirty tree detection;
- diff summary;
- optional commit;
- changelog helper.

Done when:

- the user can see what changed;
- bulk-write is blocked when the tree is dirty, if enabled.

## Milestone 7 - v1 Stabilization

Status: complete.

Goal: stable contract.

Tasks:

- tools documentation;
- examples;
- schema migration;
- benchmark on 1000 files;
- hardening;
- release 1.0.0.

## Implementation Order

```text
1. Project/read/index/validate
2. Safe writes
3. Graph/impact
4. Requirements/EDR/tasks
5. Context pack
6. Git/status
7. Packaging/docs
```

Do not start with embeddings, web UI, or a complex database. Start with reliable Markdown/Git operations.
