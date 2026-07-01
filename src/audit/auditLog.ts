import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export interface AuditLogInput {
  root: string;
  tool: string;
  target: string;
  operation: string;
  result: "ok" | "error";
  diff_summary: string;
}

export async function writeAuditLog(input: AuditLogInput): Promise<string> {
  const auditId = `AUD-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`;
  const auditDirectory = path.join(input.root, ".engimcp");
  const auditPath = path.join(auditDirectory, "audit.log");
  const record = {
    id: auditId,
    ts: new Date().toISOString(),
    tool: input.tool,
    target: input.target,
    operation: input.operation,
    result: input.result,
    diff_summary: input.diff_summary
  };

  await mkdir(auditDirectory, { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(record)}\n`, "utf8");

  return auditId;
}
