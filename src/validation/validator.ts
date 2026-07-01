import { buildDocumentRegistry, extractFrontmatterLinks } from "../documents/documentService.js";
import { assertAbsoluteRoot } from "../project/pathSafety.js";

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
  paths?: string[];
  entity_id?: string;
}

export interface ValidateProjectInput {
  root: string;
  checks?: string[];
  severity?: "error" | "warning";
}

export interface ValidateProjectResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const requiredFrontmatterFields = ["id", "kind", "status", "version"];

export async function validateProject(input: ValidateProjectInput): Promise<ValidateProjectResult> {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const ids = new Map<string, string[]>();

  for (const document of registry.documents) {
    if (document.id) {
      ids.set(document.id, [...(ids.get(document.id) ?? []), document.path]);
    }

    if (document.frontmatterError) {
      errors.push({
        code: "BROKEN_FRONTMATTER",
        message: document.frontmatterError,
        path: document.path,
        entity_id: document.id
      });
      continue;
    }

    for (const field of requiredFrontmatterFields) {
      if (document.frontmatter[field] === undefined) {
        errors.push({
          code: "MISSING_FRONTMATTER_FIELD",
          message: `Missing required frontmatter field: ${field}`,
          path: document.path,
          entity_id: document.id
        });
      }
    }

    for (const targetId of extractFrontmatterLinks(document.frontmatter)) {
      if (!registry.byId.has(targetId)) {
        warnings.push({
          code: "BROKEN_LINK",
          message: `Target ID not found: ${targetId}`,
          path: document.path,
          entity_id: document.id
        });
      }
    }
  }

  for (const [id, paths] of ids.entries()) {
    if (paths.length > 1) {
      errors.push({
        code: "DUPLICATE_ID",
        message: `ID ${id} is used by multiple documents`,
        paths,
        entity_id: id
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}
