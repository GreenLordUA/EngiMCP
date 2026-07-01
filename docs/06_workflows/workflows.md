---
id: DOC-WORKFLOWS
kind: workflow
status: draft
version: 0.1.0
---

# Core EngiMCP Workflows

## Workflow 1: Start a Session

Goal: the agent quickly restores context without reading the whole project.

```text
1. engi_project_status
2. engi_validate_project summary
3. engi_doc_read active-context
4. engi_project_map relevant top-level docs
5. respond to the user: what is known and what warnings exist
```

## Workflow 2: Change an Engineering Decision

Example: "change the drive to four geared motors".

```text
1. engi_search("drive motor gearbox")
2. engi_impact_analyze(changed_ids=[DOC-DRIVE])
3. engi_context_pack(task=...)
4. agent proposes a change plan
5. create EDR through engi_decision_create
6. update affected docs through engi_doc_patch_section
7. create tasks for recalculation/tests
8. engi_validate_project
9. git diff/status
```

## Workflow 3: Add a Requirement

```text
1. The user states a requirement.
2. The agent clarifies the type: FR/NFR/SEC/AC.
3. engi_requirement_create.
4. engi_impact_analyze for the new requirement.
5. Create design/test tasks.
6. Create an EDR if needed.
```

## Workflow 4: Prepare a Task for Codex

Goal: give Codex a compact, verifiable task.

```text
1. engi_context_pack(task=...)
2. select files to modify
3. build a prompt:
   - goal
   - relevant requirements
   - files
   - what must not change
   - acceptance criteria
4. save the prompt in docs/tasks or return it to the user
```

## Workflow 5: Validate Before Commit

```text
1. engi_validate_project
2. engi_git_status
3. if errors exist, fix them
4. if warnings are acceptable, record them in changelog/notes
5. commit manually after validation
```

## Workflow 6: Review the Project After a Month

```text
1. Find stale documents.
2. Find requirements without verification.
3. Find decisions without affected docs.
4. Find tasks blocked for more than N days.
5. Build an engineering review report.
```

## Workflow 7: Move a Chat into Documentation

```text
1. The user pastes a discussion fragment.
2. The agent extracts:
   - new requirements;
   - decisions;
   - open questions;
   - tasks;
   - risks.
3. Create/update documents.
4. Create EDRs for meaningful decisions.
5. Update active context.
```

## Workflow 8: Technical Acceptance of a Change

```text
1. A document/code change exists.
2. engi_impact_analyze.
3. Check requirements.
4. Check decisions.
5. Check tests.
6. Update validation status.
7. Write audit log.
```
