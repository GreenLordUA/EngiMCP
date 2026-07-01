import { writeAuditLog } from "../audit/auditLog.js";
import { serializeDocument } from "../documents/frontmatter.js";
import { assertAbsoluteRoot, resolveSafePath } from "../project/pathSafety.js";
import { assertProjectWritable } from "../project/writeGuards.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { slugify } from "../utils/ids.js";

export interface CreateBomItemInput {
  root: string;
  id: string;
  part_name: string;
  quantity: number;
  status?: "candidate" | "approved" | "rejected";
  source?: string;
  unit_cost?: number;
  currency?: string;
  related?: string[];
  dry_run?: boolean;
}

export async function createBomItem(input: CreateBomItemInput) {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const relativePath = `docs/bom/${input.id}-${slugify(input.part_name)}.md`;
  const content = serializeDocument(
    {
      id: input.id,
      kind: "bom_item",
      status: input.status ?? "candidate",
      version: "0.1.0",
      part_name: input.part_name,
      quantity: input.quantity,
      source: input.source,
      unit_cost: input.unit_cost,
      currency: input.currency,
      relates_to: input.related ?? []
    },
    `# ${input.id}: ${input.part_name}

| Field | Value |
|---|---|
| Quantity | ${input.quantity} |
| Status | ${input.status ?? "candidate"} |
| Source | ${input.source ?? ""} |
`
  );

  if (input.dry_run) {
    return { id: input.id, path: relativePath, content };
  }

  await atomicWrite(await resolveSafePath(root, relativePath), content);
  const auditId = await writeAuditLog({
    root,
    tool: "engi_bom_item_create",
    target: input.id,
    operation: "create",
    result: "ok",
    diff_summary: "BOM item created"
  });

  return { id: input.id, path: relativePath, audit_id: auditId };
}
