import { buildDocumentRegistry, extractFrontmatterLinks } from "../documents/documentService.js";
import { buildGraph, findDependencyCycles } from "../graph/graphBuilder.js";
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
const statusesByKind: Record<string, Set<string>> = {
  requirement: new Set([
    "draft",
    "proposed",
    "accepted",
    "implemented",
    "verified",
    "rejected",
    "superseded"
  ]),
  decision: new Set(["proposed", "accepted", "deprecated", "superseded"]),
  task: new Set(["todo", "in_progress", "blocked", "done", "cancelled"])
};

export async function validateProject(input: ValidateProjectInput): Promise<ValidateProjectResult> {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const ids = new Map<string, string[]>();
  const requirementsVerifiedByReports = new Set<string>();

  for (const document of registry.documents) {
    if (document.kind !== "test_report" && document.kind !== "test_plan") {
      continue;
    }

    for (const requirementId of extractStringList(document.frontmatter.verifies)) {
      requirementsVerifiedByReports.add(requirementId);
    }
  }

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

    const validStatuses = document.kind ? statusesByKind[document.kind] : undefined;
    if (validStatuses && document.status && !validStatuses.has(document.status)) {
      errors.push({
        code: "INVALID_STATUS",
        message: `Invalid status for ${document.kind}: ${document.status}`,
        path: document.path,
        entity_id: document.id
      });
    }

    if (
      isRequirementKind(document.kind) &&
      ["accepted", "implemented"].includes(document.status ?? "") &&
      !hasRequirementVerification(document.id, document.frontmatter, requirementsVerifiedByReports)
    ) {
      warnings.push({
        code: "REQUIREMENT_UNVERIFIED",
        message: `Requirement ${document.id ?? document.path} has no verification links`,
        path: document.path,
        entity_id: document.id
      });
    }

    if (
      isRequirementKind(document.kind) &&
      !hasRequirementVerification(document.id, document.frontmatter, requirementsVerifiedByReports)
    ) {
      warnings.push({
        code: "REQUIREMENT_WITHOUT_TESTS",
        message: `Requirement ${document.id ?? document.path} has no tests`,
        path: document.path,
        entity_id: document.id
      });
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

  const graph = await buildGraph(root);
  for (const cycle of findDependencyCycles(graph)) {
    warnings.push({
      code: "DEPENDENCY_CYCLE",
      message: `Dependency cycle detected: ${cycle.join(" -> ")}`
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function extractStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function isRequirementKind(kind: string | undefined): boolean {
  return kind === "requirement" || kind === "requirements";
}

function hasRequirementVerification(
  requirementId: string | undefined,
  frontmatter: Record<string, unknown>,
  verifiedByReports: Set<string>
): boolean {
  return (
    extractStringList(frontmatter.verified_by).length > 0 ||
    (requirementId !== undefined && verifiedByReports.has(requirementId))
  );
}
