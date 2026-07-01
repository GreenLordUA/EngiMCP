---
id: REQ-EVALUATION
kind: evaluation
status: draft
version: 0.1.0
---

# Evaluation Matrix for Existing Projects and a Custom Solution

## Goal

We need a way to compare existing MCP/knowledge-management projects and decide whether to use them, fork them, or build a custom layer.

## Evaluation Criteria

Scoring scale: 0-5.

```text
0 - absent
1 - partially present, not usable
2 - present, but requires major work
3 - usable with adaptation
4 - a good fit
5 - fully satisfies the need
```

| Criterion | Weight | What to Check |
|---|---:|---|
| Local-first | 5 | Works without cloud services or external APIs. |
| Markdown-first | 5 | Markdown is the source of truth. |
| Git-friendly | 5 | Readable diffs, no binary source of truth. |
| MCP-native | 4 | Provides MCP tools/resources/prompts. |
| Requirements | 5 | Has a requirements model and statuses. |
| ADR/EDR | 5 | Has a decision log. |
| Traceability | 5 | Has links from requirement -> decision -> doc -> test. |
| Impact analysis | 5 | Can explain the consequences of a change. |
| Section patching | 4 | Can change a section instead of the whole file. |
| Validation | 4 | Broken links, duplicate IDs, missing fields. |
| Context pack | 5 | Can provide compact, relevant context to an LLM. |
| Security | 5 | Scoped filesystem, deny patterns, read-only mode. |
| Simplicity | 4 | Can be understood and maintained by one developer. |
| Extensibility | 4 | Easy to add hardware entities. |
| Maturity | 3 | Activity, tests, releases. |

## Candidates for Comparison

| Project | Role |
|---|---|
| ContextGit | Closest reference for traceability + git-first. |
| Lifecycle MCP | Lifecycle reference: requirements/tasks/ADR. |
| ConPort | Reference for project memory and linked context. |
| Basic Memory | Reference for a Markdown-first local knowledge graph. |
| Memory Bank MCP | Reference for structured project memory. |
| Obsidian MCP | Reference for patching/frontmatter/backlinks. |
| ADR/MADR | Reference for decision records. |
| Official MCP servers/spec | Reference for protocol discipline. |

## Preliminary Assessment

| Project | Strength | Main Gap |
|---|---|---|
| ContextGit | Traceability, impact, Git | software-first, not hardware-first |
| Lifecycle MCP | Requirements/tasks/ADR | SQLite-first, not Markdown-first |
| ConPort | Memory graph | less formal requirements handling |
| Basic Memory | Markdown graph | no engineering lifecycle |
| Memory Bank MCP | Structured docs | weak traceability and impact |
| Obsidian MCP | Patching/graph | no requirements or lifecycle |

## Decision

`EngiMCP` should use these projects as references but should not copy them wholesale. The value of a custom solution is the engineering domain-model layer on top of Markdown/Git.
