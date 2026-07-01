---
id: DATA-SCHEMA
kind: data-model
status: draft
version: 0.1.0
depends_on:
  - REQ-TECH
  - ARCH-SYSTEM
impacts:
  - MCP-TOOLS
---

# EngiMCP Data Model

## General Principle

Every managed Markdown document has YAML frontmatter:

```yaml
id: DOC-EXAMPLE
kind: design_doc
status: draft
version: 0.1.0
title: Example document
summary: Short description.
tags: [mechanics, battery]
depends_on:
  - REQ-001
impacts:
  - BOM-POWER
satisfies:
  - FR-001
verified_by:
  - TEST-001
decided_by:
  - EDR-0001
updated: 2026-07-01
```

Minimum:

```yaml
id: UNIQUE-ID
kind: document
status: draft
version: 0.1.0
```

## Entity Types

### Document

Generic project document.

Fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| id | string | yes | Unique ID. |
| kind | enum | yes | Document type. |
| status | enum | yes | Status. |
| version | semver/string | yes | Document version. |
| title | string | no | Human-readable title. |
| summary | string | no | Short summary. |
| tags | list | no | Tags. |
| depends_on | list[id] | no | What this entity depends on. |
| impacts | list[id] | no | What this entity may affect. |
| satisfies | list[id] | no | Which requirements it satisfies. |
| verified_by | list[id] | no | Which tests verify it. |
| decided_by | list[id] | no | Which decisions define it. |

### Requirement

The MVP stores each requirement as a separate Markdown document. A later schema version may also support embedded records in a shared requirements file.

IDs:

```text
FR-001   functional requirement
NFR-001  non-functional requirement
SEC-001  security requirement
AC-001   acceptance criterion
```

Fields:

| Field | Type | Required |
|---|---|---:|
| id | string | yes |
| kind | `requirement` | yes |
| requirement_type | enum | yes |
| status | enum | yes |
| priority | enum | yes |
| statement | string | yes |
| rationale | string | recommended |
| acceptance | string/list | recommended |
| verified_by | list[id] | recommended |
| decided_by | list[id] | no |

Statuses:

```text
draft
proposed
accepted
implemented
verified
rejected
superseded
```

### Engineering Decision Record / EDR

ID:

```text
EDR-0001
```

Fields:

| Field | Type | Required |
|---|---|---:|
| id | string | yes |
| kind | `decision` | yes |
| status | enum | yes |
| date | date | yes |
| title | string | yes |
| context | markdown | yes |
| options | markdown/list | yes |
| decision | markdown | yes |
| consequences | markdown | yes |
| supersedes | list[id] | no |
| related_requirements | list[id] | recommended |

Statuses:

```text
proposed
accepted
deprecated
superseded
```

### Task

ID:

```text
TASK-0001
```

Fields:

```yaml
id: TASK-0001
kind: task
status: todo
priority: high
related:
  - FR-001
  - EDR-0003
blocked_by: []
```

Statuses:

```text
todo
in_progress
blocked
done
cancelled
```

### Test Plan / Test Report

IDs:

```text
TEST-PLAN-001
TEST-REPORT-001
```

Minimum:

```yaml
id: TEST-REPORT-001
kind: test_report
status: completed
verifies:
  - FR-001
  - NFR-002
result: pass
```

### BOM Item

The MVP stores BOMs as Markdown tables or CSV. For graph integration, BOM items can also be represented as separate YAML/Markdown entries.

```yaml
id: BOM-0001
kind: bom_item
status: candidate
part_name: 48V motor controller
quantity: 4
unit_cost: 0
currency: UAH
related:
  - FR-POWER-001
  - DOC-MOTORS
```

## Relationships

| Relation | Meaning |
|---|---|
| depends_on | The current document depends on another. |
| impacts | A change to the current document may affect another. |
| satisfies | A document/decision satisfies a requirement. |
| verified_by | A requirement is verified by a test. |
| verifies | A test verifies a requirement. |
| decided_by | A document or requirement is defined by a decision. |
| supersedes | The entity replaces an older entity. |
| relates_to | Loose relationship. |
| blocks | A task blocks another task. |
| derives_from | A requirement/document is derived from another. |

## SQLite Index

Recommended tables:

```sql
documents(id, path, kind, status, version, title, summary, updated_at, hash)
headings(doc_id, heading_path, level, line_start, line_end)
entities(id, entity_type, doc_id, status, title, data_json)
relations(source_id, relation_type, target_id, source_path, confidence)
validation_issues(id, severity, code, message, path, entity_id)
audit_log(id, timestamp, tool, target, operation, result, diff_summary)
```

## ID Rules

- IDs must be unique across the whole project.
- IDs must not depend on file names.
- Renaming a file must not break relationships.
- IDs must not be reused after deletion without an explicit override.

## Frontmatter Rules

- Unknown fields are allowed but must be preserved.
- Required fields are validated.
- Invalid YAML blocks write operations on the document.
