import { writeAuditLog } from "../audit/auditLog.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { serializeDocument } from "../documents/frontmatter.js";
import { assertAbsoluteRoot, resolveInsideRoot } from "../project/pathSafety.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { nextSequentialId, slugify } from "../utils/ids.js";

export interface CreateTaskInput {
  root: string;
  title: string;
  priority?: "low" | "medium" | "high";
  related?: string[];
  due?: string | null;
  dry_run?: boolean;
}

export async function createTask(input: CreateTaskInput) {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const id = nextSequentialId(registry.byId.keys(), "TASK", 4);
  const relativePath = `docs/tasks/${id}-${slugify(input.title)}.md`;
  const frontmatter = {
    id,
    kind: "task",
    status: "todo",
    priority: input.priority ?? "medium",
    version: "0.1.0",
    related: input.related ?? [],
    blocked_by: [],
    due: input.due ?? null
  };
  const body = `# ${id}: ${input.title}

## Goal

${input.title}

## Context

Related: ${(input.related ?? []).join(", ")}

## Work Items

- [ ] Define implementation steps.

## Definition of Done

- [ ] Work is complete and validated.
`;
  const content = serializeDocument(frontmatter, body);

  if (input.dry_run) {
    return { id, path: relativePath, content };
  }

  await atomicWrite(resolveInsideRoot(root, relativePath), content);
  await writeAuditLog({
    root,
    tool: "engi_task_create",
    target: id,
    operation: "create",
    result: "ok",
    diff_summary: "task created"
  });

  return { id, path: relativePath };
}
