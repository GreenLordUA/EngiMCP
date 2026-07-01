---
id: ENGIMCP-FS-OVERLAY-REQ-EN
kind: requirements-overlay
status: draft
version: 0.2.0
language: en
applies_to:
  - EngiMCP_TZ_v0.1
  - technical_requirements.md
  - tools_spec.md
  - security_model.md
  - acceptance_criteria.md
  - roadmap.md
supersedes: []
conflicts_with: []
---

# EngiMCP Project Filesystem Operations — Requirements Overlay

## 0. Purpose of this overlay

This document adds a required **Project Filesystem Operations** layer to EngiMCP.

It is intended to be applied **on top of the existing EngiMCP requirements** without replacing or weakening any previously defined behavior.

The original EngiMCP requirements define document-level operations such as:

```text
engi_doc_read
engi_doc_create
engi_doc_patch_section
engi_frontmatter_patch
engi_requirement_create
engi_decision_create
engi_task_create
```

Those document-level tools remain valid and should stay the preferred interface for managed engineering documents.

This overlay adds a lower-level but still safe project filesystem layer:

```text
engi_fs_tree
engi_fs_list
engi_fs_read
engi_fs_write
engi_fs_mkdir
engi_fs_move
engi_fs_copy
engi_fs_delete
engi_fs_exists
engi_fs_stat
engi_fs_glob
```

The goal is to allow an LLM agent to manage the project structure safely: create folders, create files, move documents, copy templates, inspect metadata, and delete obsolete files without giving the agent unrestricted shell or raw filesystem access.

## 1. Compatibility and non-conflict rules

### OVR-001 — Additive overlay

This document is an additive requirements overlay. It MUST NOT be interpreted as replacing existing EngiMCP requirements.

### OVR-002 — Document tools remain canonical for managed documents

For managed Markdown documents with EngiMCP frontmatter, document-level tools SHOULD be preferred over raw filesystem tools.

Examples:

```text
Preferred:
engi_doc_read(id="DOC-MOTORS")
engi_doc_patch_section(id="DOC-MOTORS", heading_path=[...])

Allowed but lower-level:
engi_fs_read(path="docs/mechanics/motors.md")
engi_fs_write(path="docs/mechanics/motors.md", mode="overwrite")
```

### OVR-003 — Filesystem tools must notify the project index

If a filesystem operation creates, moves, copies, renames, or deletes a managed document, the document registry and derived index MUST be updated or invalidated for re-indexing.

### OVR-004 — No raw shell execution

Filesystem tools MUST NOT expose arbitrary shell execution. The filesystem layer is a controlled project API, not a terminal.

## 2. Terminology

### Project root

The root directory of an EngiMCP project. All filesystem operations are restricted to this directory.

Example:

```text
~/Work/Projects/RadioControlledCar
```

### Managed document

A Markdown file managed by EngiMCP, normally containing YAML frontmatter with fields such as:

```yaml
id: DOC-MOTORS
kind: design_doc
status: draft
version: 0.1.0
```

### Ordinary file

A file inside the project that is not necessarily an EngiMCP managed document.

Examples:

```text
project.yaml
examples/tool_calls/example.json
bom/parts.csv
media/README.md
```

### Denied path

A path that must not be read, indexed, written, moved, copied, or included in a context pack by default.

Examples:

```text
.git/
.env
.ssh/
node_modules/
.engimcp/cache/
secret/private/key files
```

### Project trash

A project-local trash area used for safe delete operations:

```text
.engimcp/trash/YYYY-MM-DD/<original-path>
```

## 3. Design principles

### FS-PR-001 — Safe by default

Filesystem operations MUST be safe by default. Destructive behavior must require explicit parameters and must provide dry-run or diff information where appropriate.

### FS-PR-002 — Local-first

All operations MUST work locally without requiring a cloud service or external API.

### FS-PR-003 — Project-root bounded

All operations MUST be restricted to the configured project root.

### FS-PR-004 — Git-friendly

Filesystem operations SHOULD produce human-reviewable changes in Git diffs.

### FS-PR-005 — Agent-friendly, not agent-dangerous

The layer should give an LLM agent enough capability to organize a project, but not enough capability to damage arbitrary user files.

### FS-PR-006 — Document semantics are preserved

When filesystem operations affect managed documents, EngiMCP document semantics must be preserved: IDs, links, frontmatter, index entries, and validation state.

## 4. Functional requirements

## 4.1 Root and path safety

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-001 | The server MUST resolve all input paths relative to `project_root` unless explicitly documented otherwise. | MUST |
| FS-FR-002 | The server MUST reject path traversal attempts such as `../`, `../../`, or equivalent normalized escape paths. | MUST |
| FS-FR-003 | The server MUST reject absolute target paths outside `project_root`. | MUST |
| FS-FR-004 | The server MUST detect symlinks and reject symlink escape outside `project_root` by default. | MUST |
| FS-FR-005 | The server MUST apply deny patterns before reading, writing, indexing, copying, moving, or deleting paths. | MUST |
| FS-FR-006 | The server SHOULD provide a diagnostic error explaining why a path was rejected. | SHOULD |
| FS-FR-007 | The server MUST support read-only mode where all write-like filesystem tools are rejected. | MUST |

## 4.2 Directory listing and project tree

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-010 | The server MUST provide a tool to return a bounded project tree. | MUST |
| FS-FR-011 | The project tree tool MUST support `max_depth`. | MUST |
| FS-FR-012 | The project tree tool MUST respect deny patterns by default. | MUST |
| FS-FR-013 | The project tree tool MUST indicate when results are truncated. | MUST |
| FS-FR-014 | The server MUST provide a tool to list the contents of a single directory. | MUST |
| FS-FR-015 | Directory listing SHOULD include file type, size, and modification time where available. | SHOULD |

## 4.3 File read operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-020 | The server MUST provide a tool to read ordinary text files inside `project_root`. | MUST |
| FS-FR-021 | File read operations MUST enforce a maximum byte limit. | MUST |
| FS-FR-022 | File read operations MUST reject denied paths. | MUST |
| FS-FR-023 | File read operations SHOULD support modes such as `full`, `head`, `tail`, `range`, and `metadata_only`. | SHOULD |
| FS-FR-024 | For managed Markdown documents, the server SHOULD recommend using `engi_doc_read`, but MAY still allow `engi_fs_read` if the path is allowed. | SHOULD |
| FS-FR-025 | File read operations MUST NOT include denied paths in context packs. | MUST |

## 4.4 File write operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-030 | The server MUST provide a tool to create ordinary files inside `project_root`. | MUST |
| FS-FR-031 | The default file write mode MUST be `create_new`, not `overwrite`. | MUST |
| FS-FR-032 | The server MUST reject overwriting an existing file unless `mode="overwrite"` is explicitly provided. | MUST |
| FS-FR-033 | Overwrite operations MUST support `dry_run`. | MUST |
| FS-FR-034 | Overwrite operations SHOULD return a diff summary. | SHOULD |
| FS-FR-035 | File write operations MUST be atomic where practical: write temporary file, validate, then rename. | MUST |
| FS-FR-036 | File write operations MUST write an audit log entry. | MUST |
| FS-FR-037 | If a written file is a managed Markdown document, the server MUST validate YAML frontmatter after write. | MUST |
| FS-FR-038 | File write operations MUST reject denied paths. | MUST |

## 4.5 Directory creation

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-040 | The server MUST provide a tool to create directories inside `project_root`. | MUST |
| FS-FR-041 | Directory creation MUST support parent directory creation. | MUST |
| FS-FR-042 | Directory creation MUST reject denied paths. | MUST |
| FS-FR-043 | Directory creation MUST write an audit log entry. | MUST |
| FS-FR-044 | Directory creation SHOULD be idempotent when `parents=true` and the directory already exists. | SHOULD |

## 4.6 Move and rename operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-050 | The server MUST provide a tool to move or rename files and directories inside `project_root`. | MUST |
| FS-FR-051 | Move operations MUST reject source or target paths outside `project_root`. | MUST |
| FS-FR-052 | Move operations MUST reject denied source or target paths. | MUST |
| FS-FR-053 | Move operations MUST NOT overwrite the target unless `overwrite=true` is explicitly provided. | MUST |
| FS-FR-054 | Move operations MUST support `dry_run`. | MUST |
| FS-FR-055 | Move operations MUST write an audit log entry. | MUST |
| FS-FR-056 | If a managed document is moved, the server MUST update or invalidate the document index. | MUST |
| FS-FR-057 | If `update_links=true`, the server SHOULD update safe internal links or return a list of required manual link updates. | SHOULD |
| FS-FR-058 | Moving a directory containing managed documents MUST trigger re-indexing for the affected subtree. | MUST |

## 4.7 Copy operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-060 | The server SHOULD provide a tool to copy files and directories inside `project_root`. | SHOULD |
| FS-FR-061 | Copy operations MUST reject denied source or target paths. | MUST |
| FS-FR-062 | Copy operations MUST NOT overwrite the target unless `overwrite=true` is explicitly provided. | MUST |
| FS-FR-063 | Copy operations SHOULD support `dry_run`. | SHOULD |
| FS-FR-064 | Copy operations MUST write an audit log entry. | MUST |
| FS-FR-065 | Copying a managed document MUST detect duplicate IDs during validation. | MUST |

## 4.8 Delete operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-070 | The server MUST provide a safe delete tool. | MUST |
| FS-FR-071 | The default delete mode MUST be `trash`, not permanent deletion. | MUST |
| FS-FR-072 | Trash delete MUST move the target to `.engimcp/trash/YYYY-MM-DD/<original-path>`. | MUST |
| FS-FR-073 | Permanent delete SHOULD NOT be included in MVP. | SHOULD |
| FS-FR-074 | Recursive delete MUST require `recursive=true`. | MUST |
| FS-FR-075 | Delete operations MUST support `dry_run`. | MUST |
| FS-FR-076 | Delete operations MUST reject denied paths. | MUST |
| FS-FR-077 | Delete operations MUST write an audit log entry. | MUST |
| FS-FR-078 | Before deleting a managed document, the server MUST check incoming links. | MUST |
| FS-FR-079 | If deleting a managed document would create broken links, the operation MUST be rejected by default or return a blocking warning unless `force=true`. | MUST |

## 4.9 Existence and metadata

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-080 | The server MUST provide a tool to check whether a path exists. | MUST |
| FS-FR-081 | The server MUST provide a tool to return path metadata. | MUST |
| FS-FR-082 | Metadata SHOULD include file type, size, modified time, and symlink status where available. | SHOULD |
| FS-FR-083 | Existence and metadata tools MUST still respect deny patterns. | MUST |

## 4.10 Glob and discovery

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-090 | The server SHOULD provide a safe glob tool for project file discovery. | SHOULD |
| FS-FR-091 | Glob operations MUST respect deny patterns. | MUST |
| FS-FR-092 | Glob operations MUST have a result limit. | MUST |
| FS-FR-093 | Glob operations MUST NOT follow symlinks outside `project_root`. | MUST |

## 4.11 Integration with indexing and validation

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-100 | Filesystem write-like operations MUST notify or invalidate the project index. | MUST |
| FS-FR-101 | Creating a Markdown file with frontmatter SHOULD add it to the document registry. | SHOULD |
| FS-FR-102 | Moving a managed document MUST preserve its ID unless explicitly changed through document-level tools. | MUST |
| FS-FR-103 | Copying a managed document MUST trigger duplicate ID validation. | MUST |
| FS-FR-104 | Deleting a managed document MUST update or invalidate graph edges. | MUST |
| FS-FR-105 | After filesystem operations affecting managed documents, quick validation SHOULD run for affected paths. | SHOULD |

## 4.12 Bulk operations

| ID | Requirement | Priority |
|---|---|---:|
| FS-FR-110 | MVP SHOULD avoid broad bulk filesystem operations. | SHOULD |
| FS-FR-111 | If bulk operations are implemented, they MUST support `dry_run`. | MUST |
| FS-FR-112 | Bulk operations MUST return the full list of target paths before applying changes. | MUST |
| FS-FR-113 | Bulk operations SHOULD require a clean Git working tree unless explicitly overridden. | SHOULD |
| FS-FR-114 | Bulk operations MUST write audit log entries for every affected path. | MUST |

## 5. MCP tools added by this overlay

## 5.1 `engi_fs_tree`

Return a bounded tree view of the project.

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
  "items": [
    {"path": "docs", "type": "dir"},
    {"path": "docs/requirements/requirements_v0.md", "type": "file", "size": 4200}
  ],
  "truncated": false,
  "warnings": []
}
```

## 5.2 `engi_fs_list`

List one directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/requirements",
  "recursive": false,
  "include_hidden": false
}
```

Output:

```json
{
  "items": [
    {
      "path": "docs/requirements/requirements_v0.md",
      "type": "file",
      "size": 4200,
      "modified": "2026-07-01T12:00:00Z"
    }
  ]
}
```

## 5.3 `engi_fs_read`

Read an ordinary text file.

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

Allowed `mode` values:

```text
full
head
tail
range
metadata_only
```

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

## 5.4 `engi_fs_write`

Create or write an ordinary file.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/notes/new_note.md",
  "content": "# Note\n\n...",
  "mode": "create_new",
  "create_dirs": true,
  "dry_run": false
}
```

Allowed `mode` values:

```text
create_new
overwrite
append
```

Output:

```json
{
  "ok": true,
  "path": "docs/notes/new_note.md",
  "created": true,
  "changed": true,
  "diff_summary": "new file, 12 lines",
  "audit_id": "AUD-..."
}
```

## 5.5 `engi_fs_mkdir`

Create a directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/mechanics/gearbox",
  "parents": true,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "created_paths": ["docs/mechanics/gearbox"],
  "audit_id": "AUD-..."
}
```

## 5.6 `engi_fs_move`

Move or rename a file or directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "source": "docs/mechanics/motors.md",
  "target": "docs/mechanics/drive/motors.md",
  "update_links": true,
  "overwrite": false,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "moved": [
    {"from": "docs/mechanics/motors.md", "to": "docs/mechanics/drive/motors.md"}
  ],
  "links_updated": ["docs/requirements/requirements_v0.md"],
  "warnings": [],
  "audit_id": "AUD-..."
}
```

## 5.7 `engi_fs_copy`

Copy a file or directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "source": "templates/requirement.md",
  "target": "docs/requirements/FR-001-range.md",
  "overwrite": false,
  "dry_run": false
}
```

Output:

```json
{
  "ok": true,
  "copied": [
    {"from": "templates/requirement.md", "to": "docs/requirements/FR-001-range.md"}
  ],
  "audit_id": "AUD-..."
}
```

## 5.8 `engi_fs_delete`

Safely delete a file or directory.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/old/obsolete.md",
  "mode": "trash",
  "recursive": false,
  "dry_run": false,
  "reason": "superseded by EDR-0004",
  "force": false
}
```

Output:

```json
{
  "ok": true,
  "deleted": [
    {
      "path": "docs/old/obsolete.md",
      "mode": "trash",
      "trash_path": ".engimcp/trash/2026-07-01/docs/old/obsolete.md"
    }
  ],
  "broken_links_created": [],
  "audit_id": "AUD-..."
}
```

## 5.9 `engi_fs_exists`

Check whether a path exists.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/requirements/requirements_v0.md"
}
```

Output:

```json
{
  "exists": true,
  "type": "file",
  "allowed": true
}
```

## 5.10 `engi_fs_stat`

Return path metadata.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "path": "docs/requirements/requirements_v0.md"
}
```

Output:

```json
{
  "path": "docs/requirements/requirements_v0.md",
  "type": "file",
  "size": 4200,
  "modified": "2026-07-01T12:00:00Z",
  "is_symlink": false,
  "denied": false
}
```

## 5.11 `engi_fs_glob`

Find files by safe glob patterns.

Input:

```json
{
  "root": "/absolute/path/to/project",
  "patterns": ["docs/**/*.md", "bom/**/*.csv"],
  "exclude": ["**/archive/**"],
  "limit": 200
}
```

Output:

```json
{
  "matches": ["docs/requirements/requirements_v0.md"],
  "truncated": false
}
```

## 6. Security requirements added by this overlay

| ID | Requirement | Priority |
|---|---|---:|
| FS-SEC-001 | Filesystem tools MUST never operate outside `project_root`. | MUST |
| FS-SEC-002 | Filesystem tools MUST reject symlink escape outside `project_root` by default. | MUST |
| FS-SEC-003 | Filesystem tools MUST respect default deny patterns. | MUST |
| FS-SEC-004 | Filesystem tools MUST be disabled for write-like actions in read-only mode. | MUST |
| FS-SEC-005 | Destructive operations MUST support `dry_run`. | MUST |
| FS-SEC-006 | Deletion MUST use project trash by default. | MUST |
| FS-SEC-007 | Permanent deletion MUST NOT be the default behavior. | MUST |
| FS-SEC-008 | Write-like operations MUST write audit log entries. | MUST |
| FS-SEC-009 | Filesystem tools MUST NOT expose arbitrary shell execution. | MUST |
| FS-SEC-010 | Filesystem tools MUST NOT read or include denied files in context packs. | MUST |
| FS-SEC-011 | Overwrite operations MUST be explicit. | MUST |
| FS-SEC-012 | Bulk filesystem operations SHOULD require a clean Git working tree. | SHOULD |

Default deny patterns:

```yaml
deny_patterns:
  - "**/.git/**"
  - "**/.env"
  - "**/.ssh/**"
  - "**/node_modules/**"
  - "**/.engimcp/index.sqlite"
  - "**/.engimcp/cache/**"
  - "**/*secret*"
  - "**/*private*"
  - "**/*.pem"
  - "**/*.key"
```

## 7. Audit log requirements

| ID | Requirement | Priority |
|---|---|---:|
| FS-AUD-001 | `engi_fs_write` MUST write an audit log entry. | MUST |
| FS-AUD-002 | `engi_fs_mkdir` MUST write an audit log entry. | MUST |
| FS-AUD-003 | `engi_fs_move` MUST write an audit log entry. | MUST |
| FS-AUD-004 | `engi_fs_copy` MUST write an audit log entry. | MUST |
| FS-AUD-005 | `engi_fs_delete` MUST write an audit log entry. | MUST |
| FS-AUD-006 | Audit entries SHOULD include timestamp, tool name, source path, target path, dry-run flag, result, and summary. | SHOULD |

Recommended audit JSONL shape:

```json
{
  "ts": "2026-07-01T12:00:00Z",
  "tool": "engi_fs_move",
  "source": "docs/a.md",
  "target": "docs/archive/a.md",
  "dry_run": false,
  "result": "ok",
  "summary": "moved 1 file"
}
```

## 8. Error model

Filesystem tools MUST use the same general error response shape as other EngiMCP tools.

Example:

```json
{
  "ok": false,
  "error": {
    "code": "PATH_OUTSIDE_PROJECT_ROOT",
    "message": "The resolved path is outside the configured project root.",
    "path": "../../etc/passwd",
    "hint": "Use a path relative to the project root."
  }
}
```

Recommended filesystem error codes:

```text
PATH_OUTSIDE_PROJECT_ROOT
PATH_TRAVERSAL_REJECTED
SYMLINK_ESCAPE_REJECTED
DENIED_PATH
READ_ONLY_MODE
ALREADY_EXISTS
NOT_FOUND
TARGET_EXISTS
INVALID_WRITE_MODE
DRY_RUN_REQUIRED
RECURSIVE_DELETE_REQUIRED
BROKEN_LINKS_WOULD_BE_CREATED
FRONTMATTER_INVALID_AFTER_WRITE
INDEX_UPDATE_FAILED
```

## 9. Acceptance criteria added by this overlay

| ID | Scenario | Expected result |
|---|---|---|
| FS-AC-001 | Call `engi_fs_tree` on a valid project. | Returns a bounded tree and excludes `.git`, `.env`, cache, and denied paths. |
| FS-AC-002 | Call `engi_fs_mkdir` for a new directory. | Directory is created inside root and an audit log entry is written. |
| FS-AC-003 | Call `engi_fs_write` with `mode="create_new"`. | New file is created; repeated call fails with `ALREADY_EXISTS`. |
| FS-AC-004 | Call `engi_fs_write` with `mode="overwrite"` and `dry_run=true`. | File is not changed and a diff summary is returned. |
| FS-AC-005 | Move a managed Markdown document using `engi_fs_move`. | File is moved, index is updated or invalidated, and links are checked. |
| FS-AC-006 | Delete a managed document that has incoming links. | Operation is rejected or returns a blocking warning unless `force=true`. |
| FS-AC-007 | Delete a file with default settings. | File is moved to `.engimcp/trash/...`, not physically destroyed. |
| FS-AC-008 | Attempt to read `../../etc/passwd`. | Operation is rejected as path traversal. |
| FS-AC-009 | Attempt symlink escape outside root. | Operation is rejected. |
| FS-AC-010 | Run write-like filesystem tool in read-only mode. | Operation is rejected. |
| FS-AC-011 | Copy a managed document. | Duplicate ID is detected during validation. |
| FS-AC-012 | Move a folder containing managed documents. | Affected subtree is re-indexed or marked for re-indexing. |
| FS-AC-013 | Attempt to overwrite a file without explicit overwrite mode. | Operation is rejected. |
| FS-AC-014 | Attempt recursive delete without `recursive=true`. | Operation is rejected. |
| FS-AC-015 | Run `engi_fs_glob` with broad patterns. | Results are limited and denied paths are excluded. |

## 10. Roadmap insertion

This overlay adds a new milestone between the existing Markdown project core and safe document writes.

```text
Milestone 1   — Markdown project core
Milestone 1.5 — Project filesystem layer
Milestone 2   — Safe writes
```

## Milestone 1.5 — Project filesystem layer

Goal: provide safe project filesystem operations without exposing raw shell access.

Tasks:

```text
- implement safe path resolver
- implement deny patterns
- implement read-only enforcement
- implement engi_fs_tree
- implement engi_fs_list
- implement engi_fs_stat
- implement engi_fs_exists
- implement engi_fs_read with size limits
- implement engi_fs_mkdir
- implement engi_fs_write with atomic write
- implement engi_fs_move
- implement engi_fs_copy
- implement engi_fs_delete with project trash
- connect filesystem operations to index invalidation/re-indexing
- add tests for path traversal, symlink escape, denied paths, trash delete, and read-only mode
```

Done when:

```text
- an agent can create a new project folder and file safely
- an agent can move or rename a document safely
- delete moves files to project trash by default
- managed document moves trigger index/link checks
- all path security tests pass
- changes remain human-reviewable in Git diff
```

## 11. Implementation guidance

### 11.1 Recommended internal modules

The implementation should keep filesystem concerns isolated.

Suggested modules:

```text
src/fs/safePath.ts
src/fs/denyPatterns.ts
src/fs/tree.ts
src/fs/read.ts
src/fs/write.ts
src/fs/move.ts
src/fs/copy.ts
src/fs/delete.ts
src/fs/trash.ts
src/fs/audit.ts
src/fs/indexInvalidation.ts
```

### 11.2 Safe path resolver

All filesystem tools must use the same resolver.

The resolver should return something like:

```ts
type ResolvedProjectPath = {
  inputPath: string;
  normalizedRelativePath: string;
  absolutePath: string;
  insideRoot: boolean;
  denied: boolean;
  isSymlink: boolean;
  symlinkEscapesRoot: boolean;
};
```

No filesystem tool should perform path resolution manually.

### 11.3 Trash design

A trash operation should preserve enough information to restore a file manually.

Recommended layout:

```text
.engimcp/trash/
  2026-07-01/
    docs/old/obsolete.md
    manifest.jsonl
```

Manifest entry:

```json
{
  "ts": "2026-07-01T12:00:00Z",
  "original_path": "docs/old/obsolete.md",
  "trash_path": ".engimcp/trash/2026-07-01/docs/old/obsolete.md",
  "reason": "superseded by EDR-0004"
}
```

### 11.4 Index invalidation

Filesystem operations should not silently leave the index stale.

Recommended behavior:

```text
fs_write Markdown file       → re-index file
fs_move managed document     → update path and re-index
fs_copy managed document     → validate duplicate ID
fs_delete managed document   → remove from index or mark missing
fs_move directory            → re-index subtree
fs_delete directory          → invalidate affected subtree
```

## 12. Out of scope for MVP

The following should not be implemented in the MVP filesystem layer:

```text
arbitrary shell execution
chmod/chown
network filesystem access
binary patching
large media indexing
CAD file modification
watch daemon as mandatory feature
permanent delete by default
multi-user locking
enterprise permissions
```

## 13. Summary

This overlay makes filesystem and folder operations a first-class part of EngiMCP.

The key design decision is to provide a **controlled project filesystem API**, not unrestricted filesystem access.

The filesystem layer should be powerful enough for day-to-day project maintenance:

```text
create folders
create files
read files
move/rename files
copy templates
safe-delete obsolete files
inspect project tree
run safe glob discovery
```

But it must remain bounded and reviewable:

```text
root jail
deny patterns
read-only mode
dry-run
atomic writes
audit log
project trash
index invalidation
link checks for managed documents
```

This keeps EngiMCP aligned with its main goal: helping an LLM work with a long-lived engineering project safely, predictably, and in a Git-friendly way.
