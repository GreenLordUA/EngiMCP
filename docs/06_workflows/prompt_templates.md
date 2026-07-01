---
id: DOC-PROMPTS
kind: prompts
status: draft
version: 0.1.0
---

# Prompt Templates for EngiMCP

## Prompt: start_engineering_session

```text
You are working with an engineering project through EngiMCP.
First get project_status, validation summary, active context, and the list of open tasks.
Do not read the whole project unless it is necessary.
Run impact analysis before making any change.
If the change is meaningful, propose creating an EDR.
```

## Prompt: change_impact_review

```text
The user wants to change: {{change_description}}.

Steps:
1. Find seed documents through search.
2. Run impact_analyze.
3. Build a context_pack.
4. Explain which documents are affected and why.
5. Propose a minimal edit plan.
6. Do not write changes without an explicit user instruction.
```

## Prompt: create_engineering_decision

```text
Create an Engineering Decision Record.
It must include:
- context;
- problem;
- options;
- selected decision;
- consequences;
- affected requirements;
- affected documents;
- open questions.
```

## Prompt: prepare_codex_task

```text
Prepare a Codex task for: {{task}}.

Format:
# Goal
# Context
# Files to read
# Files to modify
# Requirements
# Acceptance criteria
# Do not change
# Suggested implementation steps
# Tests
```

## Prompt: documentation_review

```text
Review the documentation:
- requirements without tests;
- decisions without consequences;
- documents without IDs;
- broken links;
- stale documents;
- tasks without links.
Return the list of issues and suggest an order for fixing them.
```
