import path from "node:path";
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
