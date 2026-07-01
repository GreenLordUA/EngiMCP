import { writeAuditLog } from "../audit/auditLog.js";
import { serializeDocument } from "../documents/frontmatter.js";
import { assertAbsoluteRoot, resolveSafePath } from "../project/pathSafety.js";
import { assertProjectWritable } from "../project/writeGuards.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { slugify } from "../utils/ids.js";

export interface CreateTestReportInput {
  root: string;
  id: string;
  title: string;
  verifies: string[];
  result: "pass" | "fail" | "blocked";
  dry_run?: boolean;
}

export async function createTestReport(input: CreateTestReportInput) {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const relativePath = `docs/tests/${input.id}-${slugify(input.title)}.md`;
  const content = serializeDocument(
    {
      id: input.id,
      kind: "test_report",
      status: "completed",
      version: "0.1.0",
      verifies: input.verifies,
      result: input.result
    },
    `# ${input.id}: ${input.title}

## Result

${input.result}

## Verifies

${input.verifies.map((id) => `- ${id}`).join("\n")}
`
  );

  if (input.dry_run) {
    return { id: input.id, path: relativePath, content };
  }

  await atomicWrite(await resolveSafePath(root, relativePath), content);
  const auditId = await writeAuditLog({
    root,
    tool: "engi_test_report_create",
    target: input.id,
    operation: "create",
    result: "ok",
    diff_summary: "test report created"
  });

  return { id: input.id, path: relativePath, audit_id: auditId };
}
