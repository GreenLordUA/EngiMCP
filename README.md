---
id: README
kind: overview
status: draft
version: 1.0.0
---

# EngiMCP

EngiMCP is a local MCP server for managing engineering projects stored as Markdown, YAML frontmatter, and Git history. It gives an LLM agent structured, safe access to requirements, engineering decisions, calculations, tests, tasks, BOM items, document relationships, impact analysis, context packs, and ordinary project files.

The source of truth stays in the project folder. The SQLite index under `.engimcp/index.sqlite` is derived data and can be rebuilt.

## Why It Exists

Long-running engineering work cannot live only in chat. Requirements drift, decisions get forgotten, tests stop matching design assumptions, and documents become inconsistent.

Codex is strong at inspecting and changing code repositories, but engineering documentation needs a domain layer on top of files. EngiMCP exposes IDs, document kinds, frontmatter, links, graph relationships, validation, impact analysis, and focused writes so the agent can answer questions such as:

```text
What breaks if we change the battery?
Prepare context for changing the project motors.
Create an EDR for this design choice.
Find requirements that are not verified by tests.
```

## Requirements

- Node.js 20 or newer.
- npm.
- Git, for Git status/snapshot/commit workflows.
- An MCP-compatible client such as Codex, Claude Code, or another local MCP client.

## User Guide

EngiMCP is meant to be used through an MCP client. In normal use, you do not call TypeScript code directly. You start the server, connect it to your agent, and then ask the agent engineering-project questions in plain language.

### 1. Prepare an Engineering Project Folder

Choose or create a local folder for the project:

```bash
mkdir -p ~/Work/Projects/RC-Car
cd ~/Work/Projects/RC-Car
git init
```

EngiMCP will keep the source of truth in this folder as Markdown files plus `project.yaml`.

### 2. Install and Build EngiMCP

From the EngiMCP repository:

```bash
npm install
npm run build
```

### 3. Connect It to an MCP Client

Use the built server command in your MCP client configuration:

```text
node /absolute/path/to/EngiMCP/dist/index.js --root /absolute/path/to/your/project
```

For a read-only review session:

```text
node /absolute/path/to/EngiMCP/dist/index.js --root /absolute/path/to/your/project --read-only
```

After package installation, the binary form is:

```text
engimcp --root /absolute/path/to/project
engimcp --root /absolute/path/to/project --read-only
```

When `--root` is set, tool calls must use that same project root. When `--read-only` is set, write-like tools are rejected.

### 4. Initialize the Project

Ask your agent:

```text
Initialize this folder as an EngiMCP project.
```

The agent should call:

```text
engi_project_init(root="/absolute/path/to/project")
```

This creates the basic project files:

```text
project.yaml
docs/
templates/
.engimcp/
```

### 5. Start Working

Useful first prompts:

```text
Show project status.
Create a requirement: the car must run for 30 minutes.
Create an engineering decision for using four geared motors.
What breaks if we change the battery?
Prepare context for changing the project motors.
Find requirements that are not verified by tests.
Validate the project and show what needs fixing.
Show the Git diff summary.
```

The agent will use EngiMCP tools to read the right documents, build context, analyze links, and apply focused edits.

## Common User Workflows

### Create Requirements

Ask:

```text
Add a requirement that the radio-controlled car must stop safely when radio control is lost.
```

EngiMCP creates a managed Markdown requirement with an ID such as `FR-001`, `NFR-001`, `SEC-001`, or `AC-001`.

### Record Engineering Decisions

Ask:

```text
Create an EDR explaining why we selected a 2S LiPo battery.
```

EngiMCP creates an Engineering Decision Record such as `EDR-0001` with context, options, decision, consequences, and links.

### Analyze Change Impact

Ask:

```text
What documents, tests, BOM items, and decisions are affected if we change the battery?
```

EngiMCP follows frontmatter links and inline links to return direct and transitive impact.

### Prepare Focused Context

Ask:

```text
Prepare context for changing the drive motors.
```

EngiMCP builds a compact context pack instead of forcing the agent to read the whole project.

### Edit Documents Safely

Ask:

```text
Update the Battery Estimate section with the new runtime calculation.
```

The agent should use section-level document tools, so the edit stays focused and reviewable in Git.

### Work with Ordinary Files

Ask:

```text
List files under docs.
Read docs/battery-notes.md.
Create a folder for test reports.
Move this draft file into docs/archive.
Delete this temporary note.
```

EngiMCP uses the safe `engi_fs_*` layer. Deletes go to `.engimcp/trash/...` by default.

## Project Format

A valid project has:

```text
project.yaml
docs/
templates/
.engimcp/
```

Managed Markdown documents use YAML frontmatter with at least:

```yaml
---
id: DOC-EXAMPLE
kind: design_doc
status: draft
version: 0.1.0
---
```

You can edit Markdown files manually in VS Code, Obsidian, or another editor. Run validation after manual edits:

```text
Validate the project.
```

## Quick Start

1. Start the MCP server from this repository or install it as a binary.
2. Connect an MCP client over stdio.
3. Initialize or open a project root.
4. Call `engi_project_status` to verify the project.
5. Use `engi_context_pack` before asking the agent to change a subsystem.
6. Use `engi_impact_analyze` before changing requirements, decisions, battery, motors, BOM, tests, or calculations.
7. Use `engi_validate_project` after changes.
8. Review the Git diff with `engi_git_status`.

Example workflow:

```text
engi_project_status(root)
engi_context_pack(root, task="we are changing the project motors")
engi_impact_analyze(root, changed_ids=["DOC-RC-CAR-BATTERY"])
engi_doc_patch_section(root, id="DOC-RC-CAR-BATTERY", heading_path=["Initial Estimate"], ...)
engi_validate_project(root)
engi_git_status(root)
```

## Core Tools

Project:

- `engi_project_init`
- `engi_project_status`
- `engi_project_map`
- `engi_rebuild_index`

Managed engineering documents:

- `engi_doc_read`
- `engi_doc_create`
- `engi_frontmatter_patch`
- `engi_doc_patch_section`
- `engi_doc_add_relationship`

Engineering entities:

- `engi_requirement_create`
- `engi_decision_create`
- `engi_task_create`
- `engi_test_report_create`
- `engi_bom_item_create`

Analysis and retrieval:

- `engi_search`
- `engi_graph_query`
- `engi_impact_analyze`
- `engi_context_pack`
- `engi_validate_project`

Git:

- `engi_git_status`
- `engi_project_snapshot`
- `engi_git_commit`

Safe filesystem layer:

- `engi_fs_tree`
- `engi_fs_list`
- `engi_fs_read`
- `engi_fs_write`
- `engi_fs_mkdir`
- `engi_fs_move`
- `engi_fs_copy`
- `engi_fs_delete`
- `engi_fs_exists`
- `engi_fs_stat`
- `engi_fs_glob`

Use `engi_doc_*` for managed engineering documents where IDs, frontmatter, links, graph, and validation matter. Use `engi_fs_*` for ordinary files and folders inside the project root.

## Safety Model

EngiMCP is not raw filesystem access.

- All operations are restricted to `project_root`.
- Runtime `--root` pins the allowed project root.
- `../` traversal and absolute-path escape are rejected.
- Symlink escape outside the root is rejected.
- Deny patterns block `.git`, `.env`, SSH keys, secrets, private files, cache paths, and dependency folders.
- Project-configured deny patterns extend the defaults.
- Write-like tools respect read-only mode.
- Deletes use trash by default: `.engimcp/trash/YYYY-MM-DD/<original-path>`.
- Writes are atomic where practical.
- Write/move/copy/delete/mkdir operations write audit log entries.
- Overwrite-like operations refuse to modify files containing Git conflict markers.

## Validation and Indexing

`engi_validate_project` checks IDs, required frontmatter, duplicate IDs, broken links, dependency cycles, and requirement verification gaps.

`engi_rebuild_index` regenerates `.engimcp/index.sqlite` from Markdown and frontmatter. Filesystem write-like operations rebuild the index after successful changes, and `engi_project_status` restores the index if it is missing.

## Development Commands

```bash
npm run build
npm run lint
npm run format
npm run format:check
npm test
npm run check
npm run smoke
```

`npm run check` runs build, lint, format check, and the test suite. `npm run smoke` builds the project and runs a project-status smoke check against the radio-controlled car example.

## Important Documentation

- `docs/02_requirements/technical_requirements.md` - functional and non-functional requirements.
- `docs/02_requirements/filesystem_overlay_requirements.md` - safe filesystem layer requirements.
- `docs/02_requirements/acceptance_criteria.md` - acceptance criteria.
- `docs/03_architecture/system_architecture.md` - system architecture.
- `docs/04_data_model/entities_and_schema.md` - entity and frontmatter model.
- `docs/05_mcp_interface/tools_spec.md` - MCP tool contracts.
- `docs/05_mcp_interface/filesystem_tools_spec.md` - filesystem tool contracts.
- `docs/07_quality/testing_strategy.md` - test strategy.
- `docs/08_security/security_model.md` - security model.
- `docs/09_delivery/roadmap.md` - milestone roadmap.
- `CHANGELOG.md` - release notes.

## License

MIT.
