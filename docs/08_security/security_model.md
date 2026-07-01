---
id: DOC-SECURITY
kind: security
status: draft
version: 0.1.0
---

# EngiMCP Security Model

## Main Threats

1. The agent reads a file outside the project folder.
2. The agent overwrites an important file without user intent.
3. A symlink moves operations outside the root.
4. Secrets get included in context.
5. A bulk edit damages the project.
6. An MCP tool has overly broad capabilities.
7. The index contains stale or corrupted data.

## Filesystem Access Rules

### Root Jail

All operations are restricted to `project_root`.

Forbidden:

```text
../../
absolute path outside root
symlink outside root
```

### Default Deny Patterns

```yaml
deny_patterns:
  - "**/.env"
  - "**/.ssh/**"
  - "**/.git/**"
  - "**/node_modules/**"
  - "**/.engimcp/index.sqlite"
  - "**/*secret*"
  - "**/*private*"
```

Deny patterns must be configurable, but safe defaults are mandatory.

### Read-Only Mode

The server must support read-only mode:

```bash
engimcp --root ~/Work/Projects/RC-Car --read-only
```

In read-only mode, all write tools return an error.

## Write Safety

Every write operation:

1. Checks path scope.
2. Checks deny patterns.
3. Reads the original file.
4. Builds the new content.
5. Validates YAML/Markdown.
6. Writes to a temporary file.
7. Performs an atomic rename.
8. Writes the audit log.
9. Returns a diff summary.

For bulk writes:

- preferably require a clean Git tree;
- always return the target list;
- preferably provide a dry run.

## Audit Log

JSONL format:

```json
{"ts":"2026-07-01T12:00:00Z","tool":"engi_doc_patch_section","target":"DOC-MOTORS","result":"ok","diff_summary":"12 lines changed"}
```

The audit log is not the source of truth, but it helps reconstruct agent actions.

## Secrets

The MVP should not try to automatically recognize every possible secret, but it must:

- not read deny patterns;
- not index deny patterns;
- warn when the user explicitly asks to read a secret path;
- not include those files in context packs.

## MCP Tool Surface

Fewer tools means lower risk. The MVP should avoid:

- arbitrary shell execution;
- network requests;
- file deletion without a separate explicit tool;
- work outside the project root.

## Confirmation Mode

The MVP can work without interactive confirmation inside MCP, but it must provide `dry_run` for dangerous operations. The client/agent is responsible for showing the user a diff summary before bulk writes.

## Security Acceptance

The project is not accepted if:

- path traversal succeeds;
- symlink escape succeeds;
- read-only mode can be bypassed;
- `.env` appears in a context pack;
- a write operation leaves a corrupted file after an error.
