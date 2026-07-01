---
id: DOC-TESTING
kind: testing
status: draft
version: 0.1.0
---

# EngiMCP Testing Strategy

## Test Levels

### Unit Tests

Verify individual functions:

- parse frontmatter;
- parse headings;
- section patch;
- relation extraction;
- ID validation;
- path safety;
- atomic write.

### Integration Tests

Verify tools against a test project:

- project_init;
- doc_create;
- doc_read;
- doc_patch_section;
- graph_query;
- impact_analyze;
- validate_project;
- context_pack.

### Golden Tests

Context pack and impact analysis need golden fixtures:

```text
tests/fixtures/rc-car-mini-project
expected/context_pack_drive_change.json
expected/impact_battery_change.json
```

### Safety Tests

Required:

- path traversal: `../../secret`;
- symlink outside root;
- deny patterns `.env`, `.ssh`, `.git`;
- read-only mode;
- invalid frontmatter;
- concurrent write simulation;
- dirty Git tree before bulk write.

## MVP Test Scenarios

### Scenario T-001: New Project

```text
Given: an empty folder
When: project_init
Then: structure is created, validate_project is ok
```

### Scenario T-002: Broken Link

```text
Given: document A depends_on DOC-MISSING
When: validate_project
Then: warning/error BROKEN_LINK
```

### Scenario T-003: Duplicate ID

```text
Given: two documents with id DOC-X
When: validate_project
Then: error DUPLICATE_ID
```

### Scenario T-004: Section Patch

```text
Given: a document with sections A/B/C
When: patch section B
Then: A and C are unchanged, B is changed
```

### Scenario T-005: Impact Analysis

```text
Given: battery impacts power, power impacts motors, motors impacts BOM
When: impact_analyze battery
Then: power, motors, BOM are returned with path reasons
```

### Scenario T-006: Context Pack

```text
Given: a task about battery range
When: context_pack
Then: includes range requirements, battery, motors, power, decisions
```

## Quality Metrics

| Metric | MVP Target |
|---|---:|
| Unit test coverage for core logic | >80% |
| Write operation safety tests | 100% critical cases |
| Validation false negatives on fixtures | 0 known |
| Context pack recall on golden scenarios | >80% |
| Impact analysis explainability | every result has a reason |

## Manual Acceptance

In addition to automated tests, a manual test with a real project is needed:

1. Initialize a project.
2. Create 10 requirements.
3. Create 5 documents.
4. Create 3 EDRs.
5. Link them.
6. Change one requirement.
7. Check impact.
8. Update documents.
9. Check Git diff.
10. Build a context pack for Codex.
