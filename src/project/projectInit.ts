export interface ProjectInitResult {
  ok: boolean;
  created_paths: string[];
  warnings: string[];
}

export async function initProject(): Promise<ProjectInitResult> {
  throw new Error("engi_project_init is not implemented yet.");
}
