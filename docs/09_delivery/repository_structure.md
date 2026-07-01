---
id: DOC-REPO-STRUCTURE
kind: delivery
status: draft
version: 0.1.0
---

# Implementation Repository Structure

The MVP uses a TypeScript codebase with a clear split between MCP protocol handling, project services, document operations, graph logic, validation, storage, audit, and Git integration.

```text
engimcp/
  README.md
  AGENTS.md
  LICENSE
  package.json
  tsconfig.json
  src/
    index.ts
    server.ts
    config/
      projectConfig.ts
      schema.ts
    mcp/
      tools.ts
      resources.ts
      prompts.ts
      errors.ts
    project/
      projectService.ts
      pathSafety.ts
      projectInit.ts
    documents/
      markdownParser.ts
      frontmatter.ts
      headings.ts
      documentService.ts
      sectionPatch.ts
      templates.ts
    graph/
      graphBuilder.ts
      relations.ts
      impact.ts
    requirements/
      requirementService.ts
    decisions/
      decisionService.ts
    tasks/
      taskService.ts
    search/
      searchService.ts
      ftsIndex.ts
    context/
      contextPack.ts
      tokenBudget.ts
    validation/
      validator.ts
      checks.ts
    audit/
      auditLog.ts
    git/
      gitAdapter.ts
    storage/
      sqlite.ts
      migrations/
    utils/
      atomicWrite.ts
      ids.ts
      errors.ts
  templates/
    project/
    requirement.md
    edr.md
    task.md
    test_report.md
  tests/
    unit/
    integration/
    fixtures/
  docs/
```

## Module Boundaries

- `mcp/` owns tool/resource/prompt registration, schema validation, and MCP error mapping.
- `project/` owns project configuration, root scope, initialization, and status.
- `documents/` owns Markdown parsing, frontmatter handling, heading maps, templates, and atomic section updates.
- `graph/` owns relationship extraction, graph queries, and impact analysis.
- `requirements/`, `decisions/`, and `tasks/` own domain-specific creation and lifecycle rules.
- `search/` owns full-text and metadata search.
- `context/` owns context-pack ranking, token budgeting, and inclusion/exclusion reasons.
- `validation/` owns project integrity checks.
- `audit/` owns JSONL audit records for write operations.
- `git/` owns Git status and diff summaries.
- `storage/` owns the derived SQLite index and migrations.
- `utils/` contains low-level shared helpers only.

## Implementation Rules

- Keep Markdown and `project.yaml` as the source of truth.
- Treat SQLite as a rebuildable derived index.
- Keep public MCP schemas in `mcp/` aligned with `docs/05_mcp_interface/tools_spec.md`.
- Keep write safety helpers shared and small: path checks, deny patterns, temporary files, validation, atomic rename.
- Do not put domain logic into MCP tool handlers; tool handlers should validate input and delegate to services.
