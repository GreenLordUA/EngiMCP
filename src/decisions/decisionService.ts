import { writeAuditLog } from "../audit/auditLog.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { serializeDocument } from "../documents/frontmatter.js";
import { assertAbsoluteRoot, resolveSafePath } from "../project/pathSafety.js";
import { assertProjectWritable } from "../project/writeGuards.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { nextSequentialId, slugify } from "../utils/ids.js";

export interface CreateDecisionInput {
  root: string;
  title: string;
  status?: "proposed" | "accepted" | "deprecated" | "superseded";
  context: string;
  options: string[];
  decision: string;
  consequences: string;
  related_requirements?: string[];
  impacts?: string[];
  dry_run?: boolean;
}

export async function createDecision(input: CreateDecisionInput) {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const registry = await buildDocumentRegistry(root);
  const id = nextSequentialId(registry.byId.keys(), "EDR", 4);
  const relativePath = `docs/decisions/${id}-${slugify(input.title)}.md`;
  const frontmatter = {
    id,
    kind: "decision",
    status: input.status ?? "proposed",
    date: new Date().toISOString().slice(0, 10),
    title: input.title,
    version: "0.1.0",
    related_requirements: input.related_requirements ?? [],
    impacts: input.impacts ?? [],
    supersedes: []
  };
  const body = `# ${id}: ${input.title}

## Status

${input.status ?? "proposed"}

## Context

${input.context}

## Options

${input.options.map((option) => `- ${option}`).join("\n")}

## Decision

${input.decision}

## Consequences

${input.consequences}
`;
  const content = serializeDocument(frontmatter, body);

  if (input.dry_run) {
    return { id, path: relativePath, content };
  }

  await atomicWrite(await resolveSafePath(root, relativePath), content);
  await writeAuditLog({
    root,
    tool: "engi_decision_create",
    target: id,
    operation: "create",
    result: "ok",
    diff_summary: "decision created"
  });

  return { id, path: relativePath };
}
