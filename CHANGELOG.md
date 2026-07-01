# Changelog

## Unreleased

## 1.0.0 - 2026-07-01

### Added

- Added a TypeScript MCP server skeleton with stdio transport and structured tool registration.
- Added project initialization, status, project map, document read/create, frontmatter patch, section patch, and relationship tools.
- Added requirements, engineering decisions, tasks, test reports, BOM item creation, validation, graph query, impact analysis, context pack, search, Git status, snapshot, Git commit, and index rebuild tools.
- Added explicit MCP output schemas for all registered tools.
- Added the safe project filesystem layer: `engi_fs_tree`, `engi_fs_list`, `engi_fs_read`, `engi_fs_write`, `engi_fs_mkdir`, `engi_fs_move`, `engi_fs_copy`, `engi_fs_delete`, `engi_fs_exists`, `engi_fs_stat`, and `engi_fs_glob`.
- Added project trash semantics for safe delete operations under `.engimcp/trash/YYYY-MM-DD/<original-path>`.
- Added project-configured deny patterns on top of default deny patterns.
- Added runtime `--read-only` and `--root` options for server startup.
- Added search filters for kind, status, tags, and exact frontmatter fields.
- Added derived SQLite index restore when opening a project with a missing index.
- Added an expanded radio-controlled car example covering requirements, motors, battery, transmission, calculations, tests, BOM, and EDR impact scenarios.

### Changed

- Filesystem write, mkdir, move, copy, and delete operations now rebuild the derived index after successful changes.
- Managed document move/delete operations now report incoming and outgoing link impact.
- Moving files with `update_links=true` updates safe internal Markdown/wiki-style path links.
- Copying managed documents now runs validation so duplicate IDs are reported.
- `engi_project_map` now honors `max_depth`.
- `context_pack` now expands task-term matches through graph neighbors and records combined inclusion reasons.
- `impact_analyze` now treats `impacts` edges bidirectionally for change-impact discovery.
- Documentation now distinguishes `engi_doc_*` managed engineering document semantics from `engi_fs_*` ordinary file/folder semantics.

### Security

- Filesystem operations are root-jailed to `project_root`, reject traversal and symlink escape, enforce deny patterns, and block write-like actions in read-only mode.
- Overwrite-like operations refuse to modify files containing Git conflict markers.
- Delete defaults to trash mode; permanent delete is not part of the MVP.
- Write-like filesystem operations write audit log entries.

### Tests

- Added milestone and completion tests for project init/read/index/validate, document writes, graph/impact, requirements/EDR/tasks, context pack, Git integration, v1 stabilization, security, and filesystem layer behavior.
- Added acceptance coverage for motor-change context packs and battery-change impact analysis.
- Added smoke run through `npm run smoke`.
