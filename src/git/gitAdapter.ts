import { execFile } from "node:child_process";
import { cp, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { assertAbsoluteRoot, isDeniedPath, resolveSafePath } from "../project/pathSafety.js";
import { assertProjectWritable } from "../project/writeGuards.js";

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

export interface ProjectSnapshotResult {
  ok: boolean;
  path: string;
  copied_paths: string[];
}

export interface GitCommitResult {
  ok: boolean;
  commit: string;
  message: string;
  files: GitStatusFile[];
}

export async function getGitStatus(root: string): Promise<GitStatusSummary> {
  try {
    await execFileAsync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"]);
    const [{ stdout: statusStdout }, diffSummary] = await Promise.all([
      execFileAsync("git", ["-C", root, "status", "--short", "--untracked-files=all"]),
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

export async function createProjectSnapshot(rootInput: string): Promise<ProjectSnapshotResult> {
  const root = assertAbsoluteRoot(rootInput);
  await assertProjectWritable(root);
  const snapshotId = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const snapshotRelativePath = `.engimcp/snapshots/${snapshotId}`;
  const snapshotPath = await resolveSafePath(root, snapshotRelativePath);
  const entries = await readdir(root, { withFileTypes: true });
  const copiedPaths: string[] = [];

  await mkdir(snapshotPath, { recursive: true });

  for (const entry of entries) {
    if (shouldSkipSnapshotEntry(entry.name)) {
      continue;
    }

    const source = path.join(root, entry.name);
    const destination = path.join(snapshotPath, entry.name);
    await cp(source, destination, {
      recursive: true,
      filter: (sourcePath) => {
        const relativePath = path.relative(root, sourcePath);
        return relativePath === "" || !isDeniedPath(relativePath);
      }
    });
    copiedPaths.push(entry.name);
  }

  return {
    ok: true,
    path: snapshotRelativePath,
    copied_paths: copiedPaths.sort()
  };
}

export async function createGitCommit(
  rootInput: string,
  message: string
): Promise<GitCommitResult> {
  const root = assertAbsoluteRoot(rootInput);
  await assertProjectWritable(root);
  const before = await getGitStatus(root);

  if (!before.is_git_repo) {
    throw new Error("Project root is not a Git repository.");
  }
  if (!before.dirty) {
    throw new Error("No Git changes to commit.");
  }

  await execFileAsync("git", ["-C", root, "add", "."]);
  await execFileAsync("git", ["-C", root, "commit", "-m", message]);
  const { stdout } = await execFileAsync("git", ["-C", root, "rev-parse", "HEAD"]);

  return {
    ok: true,
    commit: stdout.trim(),
    message,
    files: before.files ?? []
  };
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

function shouldSkipSnapshotEntry(name: string): boolean {
  return name === ".git" || name === ".engimcp" || name === "node_modules" || name === "dist";
}
