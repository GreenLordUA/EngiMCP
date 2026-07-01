# Instructions for Codex/LLM Agents in the EngiMCP Project

## General Working Mode

You are working on `EngiMCP`: an MCP server for managing engineering projects in Markdown/Git.

Core principle: **documentation is the source of truth**. Code must match requirements, tests must match requirements, and every meaningful decision must have an ADR/EDR record.

## Before Changing Code

1. Read `README.md`.
2. Read `docs/02_requirements/technical_requirements.md`.
3. For the specific task, read the relevant documents in `docs/03_architecture`, `docs/04_data_model`, and `docs/05_mcp_interface`.
4. Do not rewrite whole documents when a focused edit is enough.

## Change Rules

- Do not remove requirements without creating an ADR/EDR.
- Do not change a public tool contract without updating `tools_spec.md` and tests.
- Every new tool must have:
  - purpose;
  - input schema;
  - output schema;
  - errors;
  - acceptance criteria.
- Every new entity must be described in `entities_and_schema.md`.
- Every write function must be atomic and safe.

## Style

- Documents are in English.
- Code, file names, tool names, and schemas are in English.
- Requirement IDs: `FR-001`, `NFR-001`, `SEC-001`, `AC-001`.
- Decision IDs: `EDR-0001`, `EDR-0002`.
- Task IDs: `TASK-0001`.

## Before Finishing a Task

Check:

```text
- whether requirements/documents were updated;
- whether any broken links appeared;
- whether the tools contract changed without tests;
- whether there is a decision-log entry for any meaningful decision;
- whether builds and type checks pass after any code change;
- whether the existing test suite passes after large changes or when explicitly requested;
- whether the change can be described in one changelog line.
```
