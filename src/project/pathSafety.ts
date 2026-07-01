import path from "node:path";
import { lstat, realpath } from "node:fs/promises";
import { EngiMcpError } from "../mcp/errors.js";

export function assertAbsoluteRoot(root: string): string {
  if (!path.isAbsolute(root)) {
    throw new EngiMcpError("INVALID_ROOT", "Project root must be an absolute path.");
  }

  return path.resolve(root);
}

export function isPathInsideRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveInsideRoot(root: string, relativeOrAbsolutePath: string): string {
  const target = path.resolve(root, relativeOrAbsolutePath);

  if (!isPathInsideRoot(root, target)) {
    throw new EngiMcpError("PATH_OUTSIDE_ROOT", "Path must stay inside project root.");
  }

  return target;
}

export async function resolveSafePath(
  root: string,
  relativeOrAbsolutePath: string
): Promise<string> {
  const resolvedRoot = assertAbsoluteRoot(root);
  const target = resolveInsideRoot(resolvedRoot, relativeOrAbsolutePath);
  const relative = path.relative(resolvedRoot, target);

  if (isDeniedPath(relative)) {
    throw new EngiMcpError("PATH_DENIED", `Path is denied by project safety rules: ${relative}`);
  }

  try {
    const stat = await lstat(target);
    if (stat.isSymbolicLink()) {
      const realTarget = await realpath(target);
      const realRoot = await realpath(resolvedRoot);
      if (!isPathInsideRoot(realRoot, realTarget)) {
        throw new EngiMcpError("SYMLINK_OUTSIDE_ROOT", "Symlink points outside project root.");
      }
    }
  } catch (error) {
    if (error instanceof EngiMcpError) {
      throw error;
    }
  }

  return target;
}

export function isDeniedPath(relativePath: string): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  const segments = normalized.split("/");
  const basename = segments.at(-1) ?? "";

  return (
    segments.includes(".git") ||
    segments.includes(".ssh") ||
    segments.includes("node_modules") ||
    normalized === ".engimcp/index.sqlite" ||
    basename === ".env" ||
    normalized.toLowerCase().includes("secret") ||
    normalized.toLowerCase().includes("private")
  );
}
