import path from "node:path";
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

export async function getProjectStatus(input: ProjectStatusInput): Promise<ProjectStatus> {
  const root = assertAbsoluteRoot(input.root);

  const status: ProjectStatus = {
    project_id: path.basename(root),
    documents: 0,
    requirements: 0,
    decisions: 0,
    tasks_open: 0
  };

  if (input.include_validation_summary ?? true) {
    status.validation = {
      errors: 0,
      warnings: 0
    };
  }

  if (input.include_git_status ?? true) {
    status.git = {
      is_git_repo: false,
      dirty: false,
      summary: "mock"
    };
  }

  return status;
}
