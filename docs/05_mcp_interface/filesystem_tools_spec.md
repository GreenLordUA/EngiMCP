---
id: MCP-FILESYSTEM
kind: mcp-interface
status: draft
version: 0.2.0
depends_on:
  - REQ-TECH
  - DOC-SECURITY
impacts:
  - MCP-TOOLS
  - REQ-ACCEPTANCE
  - DOC-ROADMAP
---

# EngiMCP Filesystem Tools Specification

## Purpose

The `engi_fs_*` tools provide a controlled project filesystem API. They are not raw shell access and they are not replacements for document-level tools.

Use `engi_doc_*` for managed engineering documents: frontmatter, IDs, kinds, links, graph, validation, and section-level edits.

Use `engi_fs_*` for files and folders: create, read, move, copy, delete, list, inspect metadata, and discover paths inside `project_root`.

## Common Rules

All filesystem tools must:

- operate only inside `project_root`;
- reject `../` traversal and absolute paths outside the project;
- reject symlink escape outside the project;
- respect deny patterns for `.git`, `.env`, secrets, cache, keys, and dependencies;
- enforce read-only mode for write-like operations;
- write audit log entries for write, mkdir, move, copy, and delete;
- use atomic writes for file writes;
- delete through `.engimcp/trash/YYYY-MM-DD/<original-path>` by default.

## Tools

### `engi_fs_tree`

Return a bounded project tree.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": ".",
  "max_depth": 4,
  "include_files": true,
  "include_dirs": true,
  "respect_deny_patterns": true
}
```

Output:

```json
{
  "root": "/absolute/path/to/project",
  "path": ".",
  "items": [{"path": "docs", "type": "dir"}],
  "truncated": false,
  "warnings": []
}
```

### `engi_fs_list`

List one directory, optionally recursively.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs",
  "recursive": false,
  "include_hidden": false
}
```

Output:

```json
{
  "items": [{"path": "docs/README.md", "type": "file", "size": 4200, "modified": "2026-07-01T12:00:00Z"}]
}
```

### `engi_fs_read`

Read an ordinary text file with a byte limit.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "project.yaml",
  "encoding": "utf-8",
  "max_bytes": 200000,
  "mode": "full"
}
```

Allowed modes: `full`, `head`, `tail`, `range`, `metadata_only`.

Output:

```json
{
  "path": "project.yaml",
  "type": "file",
  "encoding": "utf-8",
  "content": "...",
  "size": 1200,
  "truncated": false
}
```

### `engi_fs_write`

Create, overwrite, or append an ordinary file.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/notes/new_note.md",
  "content": "# Note\n",
  "mode": "create_new",
  "create_dirs": true,
  "dry_run": false
}
```

Allowed modes: `create_new`, `overwrite`, `append`.

Output:

```json
{
  "ok": true,
  "path": "docs/notes/new_note.md",
  "created": true,
  "changed": true,
  "diff_summary": "new file, 1 lines",
  "audit_id": "AUD-..."
}
```

### `engi_fs_mkdir`

Create a directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/mechanics",
  "parents": true,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "created_paths": ["docs/mechanics"],
  "audit_id": "AUD-..."
}
```

### `engi_fs_move`

Move or rename a file or directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "source": "docs/a.md",
  "target": "docs/archive/a.md",
  "update_links": true,
  "overwrite": false,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "moved": [{"from": "docs/a.md", "to": "docs/archive/a.md"}],
  "links_updated": [],
  "warnings": [],
  "audit_id": "AUD-..."
}
```

### `engi_fs_copy`

Copy a file or directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "source": "templates/requirement.md",
  "target": "docs/requirements/FR-001.md",
  "overwrite": false,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "copied": [{"from": "templates/requirement.md", "to": "docs/requirements/FR-001.md"}],
  "audit_id": "AUD-..."
}
```

### `engi_fs_delete`

Delete safely by moving the path to project trash.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/old/obsolete.md",
  "mode": "trash",
  "recursive": false,
  "dry_run": false,
  "reason": "superseded",
  "force": false
}
```

Output:

```json
{
  "ok": true,
  "deleted": [{"path": "docs/old/obsolete.md", "mode": "trash", "trash_path": ".engimcp/trash/2026-07-01/docs/old/obsolete.md"}],
  "broken_links_created": [],
  "audit_id": "AUD-..."
}
```

### `engi_fs_exists`

Check whether a path exists.

### `engi_fs_stat`

Return metadata: type, size, modified time, symlink flag, and deny status.

### `engi_fs_glob`

Find files by safe glob patterns with a result limit.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "patterns": ["docs/**/*.md"],
  "exclude": ["**/archive/**"],
  "limit": 200
}
```

Output:

```json
{
  "matches": ["docs/README.md"],
  "truncated": false
}
```

## Errors

Common error codes:

```text
PATH_OUTSIDE_ROOT
SYMLINK_OUTSIDE_ROOT
PATH_DENIED
READ_ONLY
ALREADY_EXISTS
NOT_FOUND
TARGET_EXISTS
RECURSIVE_DELETE_REQUIRED
BROKEN_LINKS_WOULD_BE_CREATED
FRONTMATTER_INVALID_AFTER_WRITE
```

## Acceptance Criteria

- denied paths never appear in tree/list/glob output;
- traversal and symlink escape are rejected;
- write-like tools are blocked in read-only mode;
- overwrite and delete support dry-run;
- delete defaults to trash;
- managed document delete checks incoming links;
- write-like tools create audit log entries.
