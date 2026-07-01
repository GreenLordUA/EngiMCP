---
id: MCP-CONTEXT-PACK
kind: mcp-interface
status: draft
version: 0.1.0
---

# Context Pack Specification

## Purpose

`context_pack` is a compact set of relevant context returned by the MCP server to an LLM agent for a specific task. The goal is to avoid reading the whole project and instead provide the minimal sufficient set of documents and sections.

## Input

```json
{
  "task": "Change the drive from 2 motors to 4 geared motors",
  "seed_ids": ["REQ-V0", "DOC-DRIVE"],
  "max_tokens": 12000,
  "include_sections": true,
  "include_decisions": true,
  "include_open_tasks": true,
  "include_validation": true
}
```

## MVP Algorithm

1. Find seed documents by ID.
2. Add documents found by searching task terms.
3. Add graph neighbors at depth 1-2.
4. Add related requirements.
5. Add related accepted/proposed decisions.
6. Add open tasks for the same IDs.
7. Remove irrelevant large documents and keep sections instead.
8. Sort by relevance reason.
9. Trim to `max_tokens`.
10. Return warnings if the context is incomplete.

## Output Structure

```json
{
  "pack_id": "CTX-20260701-001",
  "task": "...",
  "estimated_tokens": 9400,
  "items": [
    {
      "id": "REQ-V0",
      "path": "docs/requirements/v0.md",
      "kind": "requirements",
      "reason": "seed document",
      "content_mode": "full",
      "content": "..."
    },
    {
      "id": "DOC-BATTERY",
      "path": "docs/mechanics/battery.md",
      "kind": "design_doc",
      "reason": "impacted by DOC-DRIVE",
      "content_mode": "section",
      "heading_path": ["Battery", "Constraints"],
      "content": "..."
    }
  ],
  "excluded": [
    {"id": "DOC-OLD", "reason": "superseded"}
  ],
  "warnings": [
    "DOC-BOM has invalid frontmatter, included as raw text only"
  ]
}
```

## Quality Criteria

A good context pack:

- contains the requirements that are explicitly needed;
- contains decisions that explain why the system is the way it is;
- contains only current documents;
- explains why each document was included;
- stays within the limit;
- does not hide incompleteness warnings;
- does not include secrets or excluded files.

## Metrics

| Metric | MVP Target |
|---|---:|
| Precision of manually evaluated context packs | >70% |
| Recall of key documents in test scenarios | >80% |
| Average pack size | <12k tokens |
| Share of irrelevant text | <30% |
