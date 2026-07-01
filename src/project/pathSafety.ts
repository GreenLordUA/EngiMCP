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

  await assertRealPathInsideRoot(resolvedRoot, target);

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
    normalized.startsWith(".engimcp/cache/") ||
    basename === ".env" ||
    basename.endsWith(".pem") ||
    basename.endsWith(".key") ||
    normalized.toLowerCase().includes("secret") ||
    normalized.toLowerCase().includes("private")
  );
}

async function assertRealPathInsideRoot(root: string, target: string): Promise<void> {
  const realRoot = await realpath(root);

  try {
    const realTarget = await realpath(target);
    if (!isPathInsideRoot(realRoot, realTarget)) {
      throw new EngiMcpError("SYMLINK_OUTSIDE_ROOT", "Path resolves outside project root.");
    }
    return;
  } catch (error) {
    if (error instanceof EngiMcpError) {
      throw error;
    }
  }

  let parent = path.dirname(target);
  while (parent !== root && parent !== path.dirname(parent)) {
    try {
      const stat = await lstat(parent);
      if (stat.isSymbolicLink()) {
        const realParent = await realpath(parent);
        if (!isPathInsideRoot(realRoot, realParent)) {
          throw new EngiMcpError("SYMLINK_OUTSIDE_ROOT", "Path resolves outside project root.");
        }
      }
      return;
    } catch (error) {
      if (error instanceof EngiMcpError) {
        throw error;
      }
      parent = path.dirname(parent);
    }
  }
}
