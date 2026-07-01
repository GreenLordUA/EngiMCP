import { readFile } from "node:fs/promises";
import path from "node:path";

const builtInTemplates: Record<string, string> = {
  design_doc: `---
id: DOC-EXAMPLE
kind: design_doc
status: draft
version: 0.1.0
---

# Document Title

## Purpose

## Requirements

## Current Solution

## Calculations / Arguments

## Risks

## Related Documents
`,
  requirement: `---
id: FR-000
kind: requirement
status: draft
version: 0.1.0
---

# Requirement Title
`,
  edr: `---
id: EDR-0000
kind: decision
status: proposed
version: 0.1.0
---

# Decision Title
`,
  task: `---
id: TASK-0000
kind: task
status: todo
version: 0.1.0
---

# Task Title
`
};

export async function loadTemplate(root: string, template: string, kind: string): Promise<string> {
  const localTemplatePath = path.join(root, "templates", `${template}.md`);

  try {
    return await readFile(localTemplatePath, "utf8");
  } catch {
    return builtInTemplates[template] ?? builtInTemplates[kind] ?? builtInTemplates.design_doc;
  }
}
