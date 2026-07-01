import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getGitStatus } from "../src/git/gitAdapter.js";

const execFileAsync = promisify(execFile);
let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-m6-"));
  await execFileAsync("git", ["init"], { cwd: tempRoot });
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("milestone 6 git integration", () => {
  it("returns clean status for an empty git repository", async () => {
    const status = await getGitStatus(tempRoot);

    expect(status.is_git_repo).toBe(true);
    expect(status.dirty).toBe(false);
    expect(status.summary).toBe("clean");
    expect(status.files).toEqual([]);
  });

  it("returns changed files and diff summary", async () => {
    await writeFile(path.join(tempRoot, "a.md"), "# A\n", "utf8");

    const status = await getGitStatus(tempRoot);

    expect(status.is_git_repo).toBe(true);
    expect(status.dirty).toBe(true);
    expect(status.summary).toBe("1 changed");
    expect(status.files).toEqual([{ path: "a.md", status: "??" }]);
  });

  it("handles non-git directories", async () => {
    const nonGitRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-m6-nongit-"));

    try {
      const status = await getGitStatus(nonGitRoot);

      expect(status.is_git_repo).toBe(false);
      expect(status.summary).toBe("not a git repository");
    } finally {
      await rm(nonGitRoot, { recursive: true, force: true });
    }
  });
});
