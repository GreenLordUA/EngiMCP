---
id: MCP-TOOLS
kind: mcp-interface
status: draft
version: 0.1.0
depends_on:
  - DATA-SCHEMA
  - REQ-TECH
---

# EngiMCP MCP Tools Specification

## Naming

All tools use the `engi_` prefix.

The MVP should expose a small but sufficient set. Do not add a tool if the same operation can be expressed through parameters of an existing tool without losing clarity.

## MVP Tools

### 1. `engi_project_init`

Create the project structure.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "template": "default",
  "force": false
}
```

Output:

```json
{
  "ok": true,
  "created_paths": ["project.yaml", "docs/", "templates/"],
  "warnings": []
}
```

Errors:

- root is not absolute;
- root is not accessible;
- project already exists and `force=false`.

### 2. `engi_project_status`

Return a concise project status.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "include_validation_summary": true,
  "include_git_status": true
}
```

Output:

```json
{
  "project_id": "rc-car",
  "documents": 42,
  "requirements": 18,
  "decisions": 7,
  "tasks_open": 12,
  "validation": {"errors": 0, "warnings": 3},
  "git": {"dirty": true, "summary": "3 modified"}
}
```

### 3. `engi_project_map`

Return a document tree/map.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "kind": ["requirement", "decision", "design_doc"],
  "max_depth": 4
}
```

Output:

```json
{
  "items": [
    {"id": "REQ-TECH", "path": "docs/02_requirements/technical_requirements.md", "kind": "requirements", "status": "draft"}
  ]
}
```

### 4. `engi_doc_read`

Read a document by ID or path.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "id": "DOC-MOTORS",
  "path": null,
  "mode": "full"
}
```

`mode`:

```text
full
summary
frontmatter
headings
section
```

Output:

```json
{
  "id": "DOC-MOTORS",
  "path": "docs/mechanics/motors.md",
  "frontmatter": {},
  "content": "...",
  "headings": ["# Motors", "## Requirements"],
  "links": []
}
```

### 5. `engi_doc_create`

Create a document from a template.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "kind": "decision",
  "id": "EDR-0001",
  "title": "Choosing Markdown-first",
  "path": "docs/decisions/EDR-0001-markdown-first.md",
  "template": "edr",
  "frontmatter": {
    "status": "accepted"
  }
}
```

Output:

```json
{
  "ok": true,
  "path": "docs/decisions/EDR-0001-markdown-first.md",
  "id": "EDR-0001"
}
```

### 6. `engi_doc_patch_section`

Replace or add a section with a focused edit.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "id": "DOC-MOTORS",
  "heading_path": ["Motors", "Requirements"],
  "operation": "replace",
  "content": "## Requirements\n\nNew text...",
  "dry_run": false
}
```

Operations:

```text
replace
append
prepend
insert_after
```

Output:

```json
{
  "ok": true,
  "changed": true,
  "diff_summary": "12 lines changed",
  "audit_id": "AUD-..."
}
```

### 7. `engi_frontmatter_patch`

Modify frontmatter.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "id": "DOC-MOTORS",
  "patch": {
    "status": "accepted",
    "depends_on": ["REQ-V0"]
  },
  "dry_run": false
}
```

### 8. `engi_search`

Search the project.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "query": "motor gearbox",
  "filters": {
    "kind": ["design_doc", "requirement"],
    "status": ["draft", "accepted"]
  },
  "limit": 20
}
```

Output:

```json
{
  "results": [
    {"id": "DOC-MOTORS", "path": "docs/mechanics/motors.md", "score": 0.91, "snippet": "..."}
  ]
}
```

### 9. `engi_graph_query`

Return relationships for a document/entity.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "id": "DOC-MOTORS",
  "direction": "both",
  "depth": 2,
  "relation_types": ["depends_on", "impacts", "decided_by"]
}
```

Output:

```json
{
  "nodes": [],
  "edges": []
}
```

### 10. `engi_impact_analyze`

Assess the consequences of a change.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "changed_ids": ["DOC-BATTERY"],
  "change_description": "increase battery capacity from 2200 mAh to 5000 mAh",
  "depth": 3
}
```

Output:

```json
{
  "impact": [
    {
      "id": "DOC-MOTORS",
      "path": "docs/mechanics/motors.md",
      "reason": "DOC-MOTORS depends_on DOC-BATTERY through power budget",
      "severity": "medium"
    }
  ],
  "recommended_reads": ["REQ-V0", "DOC-POWER", "BOM-POWER"],
  "recommended_actions": ["create_decision", "update_calculation", "review_BOM"]
}
```

### 11. `engi_context_pack`

Build compact task-specific context.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "task": "Prepare a battery calculation for 30 minute runtime",
  "seed_ids": ["REQ-V0"],
  "max_tokens": 12000,
  "include_sections": true
}
```

Output:

```json
{
  "pack_id": "CTX-...",
  "estimated_tokens": 8200,
  "items": [
    {
      "id": "REQ-V0",
      "reason": "seed requirement",
      "content": "..."
    }
  ],
  "warnings": []
}
```

### 12. `engi_requirement_create`

Create a requirement.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "requirement_type": "functional",
  "title": "30 minute runtime",
  "statement": "The radio-controlled car must run for at least 30 minutes under mixed driving.",
  "priority": "must",
  "rationale": "Initial project specification.",
  "related": ["DOC-VISION"]
}
```

Output:

```json
{
  "id": "FR-001",
  "path": "docs/requirements/FR-001-range-30km.md"
}
```

### 13. `engi_decision_create`

Create an EDR.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "title": "Choosing four geared motors near the wheels",
  "status": "accepted",
  "context": "...",
  "options": ["wheel hub motors", "four geared motors", "two side motors"],
  "decision": "...",
  "consequences": "...",
  "related_requirements": ["FR-001"],
  "impacts": ["DOC-MOTORS", "DOC-TRANSMISSION"]
}
```

### 14. `engi_task_create`

Create a task.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "title": "Select geared motors",
  "priority": "high",
  "related": ["FR-001", "EDR-0003"],
  "due": null
}
```

### 15. `engi_validate_project`

Validation.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "checks": ["ids", "frontmatter", "links", "requirements", "cycles"],
  "severity": "warning"
}
```

Output:

```json
{
  "ok": false,
  "errors": [
    {"code": "DUPLICATE_ID", "message": "ID DOC-MOTORS used twice", "paths": ["a.md", "b.md"]}
  ],
  "warnings": []
}
```

### 16. `engi_git_status`

Input:

```json
{
  "root": "/absolute/path/to/project"
}
```

Output:

```json
{
  "is_git_repo": true,
  "dirty": true,
  "files": [
    {"path": "docs/mechanics/motors.md", "status": "modified"}
  ]
}
```

## MVP Resources

### `engi://project/status`

Concise project status.

### `engi://project/map`

Document map.

### `engi://project/active-context`

Current active context, if present.

### `engi://validation/summary`

Validation summary.

## MVP Prompts

### `start_engineering_session`

Prepare the agent for work:

```text
read project status
read active context
read open tasks
read validation summary
```

### `change_impact_review`

Change analysis scenario:

```text
1. impact_analyze
2. context_pack
3. propose affected docs
4. ask before write/bulk changes
```

### `create_engineering_decision`

Scenario for creating an EDR.

### `prepare_codex_task`

Build a task for Codex:

```text
goal
context
files
requirements
acceptance criteria
what not to change
```

## Errors

Standard error shape:

```json
{
  "ok": false,
  "error": {
    "code": "BROKEN_FRONTMATTER",
    "message": "Cannot parse YAML frontmatter",
    "path": "docs/a.md",
    "hint": "Fix YAML before write operations"
  }
}
```

## Rules for Write Tools

- Every write tool must support `dry_run` if the change is potentially dangerous.
- Every write tool must write an audit log.
- Every write tool must check path scope.
- Every write tool must be atomic.
- Bulk writes must include a target list and diff summary.
