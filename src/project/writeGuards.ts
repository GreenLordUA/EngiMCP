import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { readProjectConfig } from "../config/projectConfig.js";
import { EngiMcpError } from "../mcp/errors.js";
import { getRuntimeOptions } from "../runtime/options.js";

export async function assertProjectWritable(root: string): Promise<void> {
  if (getRuntimeOptions().readOnly) {
    throw new EngiMcpError("READ_ONLY", "Project is in read-only mode.");
  }

  try {
    const config = await readProjectConfig(root);
    if (config.mcp?.read_only_mode) {
      throw new EngiMcpError("READ_ONLY", "Project is in read-only mode.");
    }
  } catch (error) {
    if (error instanceof EngiMcpError) {
      throw error;
    }
  }
}

export function assertNoGitConflictMarkers(content: string, displayPath: string): void {
  if (/^<<<<<<< .*\r?\n[\s\S]*?^=======\r?\n[\s\S]*?^>>>>>>> .*$/m.test(content)) {
    throw new EngiMcpError(
      "GIT_CONFLICT_PRESENT",
      `Refusing to overwrite ${displayPath} because it contains Git conflict markers.`
    );
  }
}

export async function assertPathHasNoGitConflictMarkers(
  absolutePath: string,
  displayPath: string
): Promise<void> {
  let fileStat;
  try {
    fileStat = await lstat(absolutePath);
  } catch {
    return;
  }

  if (fileStat.isDirectory()) {
    for (const entry of await readdir(absolutePath, { withFileTypes: true })) {
      await assertPathHasNoGitConflictMarkers(
        path.join(absolutePath, entry.name),
        path.posix.join(displayPath, entry.name)
      );
    }
    return;
  }

  if (!fileStat.isFile()) {
    return;
  }

  assertNoGitConflictMarkers(await readFile(absolutePath, "utf8"), displayPath);
}
