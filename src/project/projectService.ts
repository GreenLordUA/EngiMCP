import path from "node:path";
import { readProjectConfig } from "../config/projectConfig.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { getGitStatus } from "../git/gitAdapter.js";
import { validateProject } from "../validation/validator.js";
import { assertAbsoluteRoot } from "./pathSafety.js";

export interface ProjectStatusInput {
  root: string;
  include_validation_summary?: boolean;
  include_git_status?: boolean;
}

export interface ProjectStatus {
  project_id: string;
  documents: number;
  requirements: number;
  decisions: number;
  tasks_open: number;
  validation?: {
    errors: number;
    warnings: number;
  };
  git?: {
    is_git_repo: boolean;
    dirty: boolean;
    summary: string;
  };
}

export interface ProjectMapInput {
  root: string;
  kind?: string[];
  max_depth?: number;
}

export interface ProjectMapItem {
  id?: string;
  path: string;
  kind?: string;
  status?: string;
}

export async function getProjectStatus(input: ProjectStatusInput): Promise<ProjectStatus> {
  const root = assertAbsoluteRoot(input.root);
  const [projectConfig, registry] = await Promise.all([
    readProjectConfig(root),
    buildDocumentRegistry(root)
  ]);

  const status: ProjectStatus = {
    project_id: projectConfig.project.id ?? path.basename(root),
    documents: registry.documents.length,
    requirements: registry.documents.filter((document) => isRequirement(document.kind, document.id))
      .length,
    decisions: registry.documents.filter((document) => isDecision(document.kind, document.id))
      .length,
    tasks_open: registry.documents.filter(
      (document) =>
        document.kind === "task" && document.status !== "done" && document.status !== "cancelled"
    ).length
  };

  if (input.include_validation_summary ?? true) {
    const validation = await validateProject({ root, severity: "warning" });
    status.validation = {
      errors: validation.errors.length,
      warnings: validation.warnings.length
    };
  }

  if (input.include_git_status ?? true) {
    status.git = await getGitStatus(root);
  }

  return status;
}

export async function getProjectMap(input: ProjectMapInput): Promise<{ items: ProjectMapItem[] }> {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const allowedKinds = input.kind && input.kind.length > 0 ? new Set(input.kind) : undefined;

  const items = registry.documents
    .filter((document) => !allowedKinds || (document.kind && allowedKinds.has(document.kind)))
    .map((document) => ({
      id: document.id,
      path: document.path,
      kind: document.kind,
      status: document.status
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return { items };
}

function isRequirement(kind: string | undefined, id: string | undefined): boolean {
  return kind === "requirement" || kind === "requirements" || /^(FR|NFR|SEC|AC)-\d+/.test(id ?? "");
}

function isDecision(kind: string | undefined, id: string | undefined): boolean {
  return kind === "decision" || kind === "decision-log" || /^EDR-\d+/.test(id ?? "");
}
