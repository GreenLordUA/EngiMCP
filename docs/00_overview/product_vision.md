---
id: DOC-VISION
kind: overview
status: draft
version: 0.1.0
depends_on: []
impacts:
  - REQ-TECH
  - ARCH-SYSTEM
---

# Product Vision: EngiMCP / Engineering MCP

## Problem

A large engineering project lives for a long time and consists of more than code. It contains specifications, calculations, design decisions, test reports, BOMs, risks, plans, requirements, and the history of trade-offs. A regular chat is a poor fit for this work: context disappears, the model does not remember why decisions were made, and documents drift out of sync.

Plain file access is not enough either: an agent can see files, but it does not understand that `battery.md` is connected to `power.md`, `BOM.md`, `requirements_v0.md`, and test reports.

## Product

`EngiMCP` is a local MCP server that turns an engineering project folder into a manageable project model.

It should give the agent tools to:

- read documents by semantic IDs;
- find related documents;
- update individual sections without damaging the file;
- maintain a decision log;
- link requirements, calculations, tests, and BOMs;
- run impact analysis;
- build compact context for an LLM;
- validate project integrity.

## Target User

Primary users:

- solo engineers/developers;
- small hardware/software teams;
- people who manage projects in Git + Markdown + VS Code/Obsidian;
- users of Codex, Claude Code, or another MCP-compatible agent.

Secondary users:

- open-source hardware projects;
- R&D teams;
- student engineering projects;
- startups that are not ready for heavy ALM tooling.

## Non-Goals for the MVP

The MVP should not try to replace:

- Jira;
- Polarion;
- Jama;
- IBM DOORS;
- a full PLM/PDM system;
- CAD/PDM;
- ERP;
- procurement systems.

The MVP should be a lightweight local tool that can run on a project folder.

## Principles

1. **Local-first.** Data is stored locally.
2. **Markdown-first.** A human can read and edit documents without the server.
3. **Git-friendly.** All changes should produce useful diffs.
4. **Traceability-first.** A requirement should be linked to decisions, calculations, and tests.
5. **Small context.** The agent reads only the required documents.
6. **Safe writes.** Every write is atomic, reversible, and visible in Git.
7. **Human readable.** No binary sources of truth in the MVP.
8. **Domain-aware.** The system understands engineering entities, not only files.
