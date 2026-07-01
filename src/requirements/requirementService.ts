import { writeAuditLog } from "../audit/auditLog.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { serializeDocument } from "../documents/frontmatter.js";
import { assertAbsoluteRoot, resolveInsideRoot } from "../project/pathSafety.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { nextSequentialId, slugify } from "../utils/ids.js";

export interface CreateRequirementInput {
  root: string;
  requirement_type: "functional" | "non_functional" | "security" | "acceptance";
  title: string;
  statement: string;
  priority: "must" | "should" | "could" | "wont";
  rationale?: string;
  related?: string[];
  dry_run?: boolean;
}

export async function createRequirement(input: CreateRequirementInput) {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const id = nextSequentialId(registry.byId.keys(), requirementPrefix(input.requirement_type));
  const relativePath = `docs/requirements/${id}-${slugify(input.title)}.md`;
  const frontmatter = {
    id,
    kind: "requirement",
    requirement_type: input.requirement_type,
    status: "draft",
    priority: input.priority,
    version: "0.1.0",
    statement: input.statement,
    rationale: input.rationale,
    relates_to: input.related ?? [],
    verified_by: [],
    decided_by: []
  };
  const body = `# ${id}: ${input.title}

## Statement

${input.statement}

## Rationale

${input.rationale ?? ""}

## Acceptance Criteria

- [ ] Define verification.

## Links

- Related: ${(input.related ?? []).join(", ")}
`;
  const content = serializeDocument(frontmatter, body);

  if (input.dry_run) {
    return { id, path: relativePath, content };
  }

  await atomicWrite(resolveInsideRoot(root, relativePath), content);
  await writeAuditLog({
    root,
    tool: "engi_requirement_create",
    target: id,
    operation: "create",
    result: "ok",
    diff_summary: "requirement created"
  });

  return { id, path: relativePath };
}

function requirementPrefix(type: CreateRequirementInput["requirement_type"]): string {
  if (type === "non_functional") {
    return "NFR";
  }
  if (type === "security") {
    return "SEC";
  }
  if (type === "acceptance") {
    return "AC";
  }
  return "FR";
}
