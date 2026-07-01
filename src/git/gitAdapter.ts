import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitStatusSummary {
  is_git_repo: boolean;
  dirty: boolean;
  summary: string;
  files?: GitStatusFile[];
  diff_summary?: string;
}

export interface GitStatusFile {
  path: string;
  status: string;
}

export async function getGitStatus(root: string): Promise<GitStatusSummary> {
  try {
    await execFileAsync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"]);
    const [{ stdout: statusStdout }, diffSummary] = await Promise.all([
      execFileAsync("git", ["-C", root, "status", "--short"]),
      getDiffSummary(root)
    ]);
    const files = parseStatusFiles(statusStdout);

    return {
      is_git_repo: true,
      dirty: files.length > 0,
      summary: files.length === 0 ? "clean" : `${files.length} changed`,
      files,
      diff_summary: diffSummary
    };
  } catch {
    return {
      is_git_repo: false,
      dirty: false,
      summary: "not a git repository"
    };
  }
}

async function getDiffSummary(root: string): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, "diff", "--stat"]);
  return stdout.trim();
}

function parseStatusFiles(stdout: string): GitStatusFile[] {
  return stdout
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2).trim(),
      path: (line[2] === " " ? line.slice(3) : line.slice(2)).trim()
    }));
}
