import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitStatusSummary {
  is_git_repo: boolean;
  dirty: boolean;
  summary: string;
}

export async function getGitStatus(root: string): Promise<GitStatusSummary> {
  try {
    await execFileAsync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"]);
    const { stdout } = await execFileAsync("git", ["-C", root, "status", "--short"]);
    const files = stdout.trim().split(/\r?\n/).filter(Boolean);

    return {
      is_git_repo: true,
      dirty: files.length > 0,
      summary: files.length === 0 ? "clean" : `${files.length} changed`
    };
  } catch {
    return {
      is_git_repo: false,
      dirty: false,
      summary: "not a git repository"
    };
  }
}
