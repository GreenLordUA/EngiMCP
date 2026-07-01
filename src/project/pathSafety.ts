import path from "node:path";
import { lstat, realpath } from "node:fs/promises";
import { readProjectConfig } from "../config/projectConfig.js";
import { EngiMcpError } from "../mcp/errors.js";
import { getRuntimeOptions } from "../runtime/options.js";

export function assertAbsoluteRoot(root: string): string {
  if (!path.isAbsolute(root)) {
    throw new EngiMcpError("INVALID_ROOT", "Project root must be an absolute path.");
  }

  const resolvedRoot = path.resolve(root);
  const runtimeRoot = getRuntimeOptions().root;
  if (runtimeRoot && path.resolve(runtimeRoot) !== resolvedRoot) {
    throw new EngiMcpError(
      "ROOT_MISMATCH",
      `Project root must match the configured project root: ${runtimeRoot}`
    );
  }

  return resolvedRoot;
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

  if (await isDeniedPathForRoot(resolvedRoot, relative)) {
    throw new EngiMcpError("PATH_DENIED", `Path is denied by project safety rules: ${relative}`);
  }

  await assertRealPathInsideRoot(resolvedRoot, target);

  return target;
}

export function isDeniedPath(relativePath: string): boolean {
  return isDeniedByPatterns(relativePath, defaultDenyPatterns);
}

export async function isDeniedPathForRoot(root: string, relativePath: string): Promise<boolean> {
  const patterns = [...defaultDenyPatterns];
  try {
    const config = await readProjectConfig(root);
    patterns.push(...(config.security?.deny_patterns ?? []));
  } catch {
    // Project config may not exist during early initialization; safe defaults still apply.
  }

  return isDeniedByPatterns(relativePath, patterns);
}

const defaultDenyPatterns = [
  "**/.git",
  "**/.git/**",
  "**/.env",
  "**/.ssh",
  "**/.ssh/**",
  "**/node_modules",
  "**/node_modules/**",
  "**/.engimcp/index.sqlite",
  "**/.engimcp/cache",
  "**/.engimcp/cache/**",
  "**/*secret*",
  "**/*private*",
  "**/*.pem",
  "**/*.key"
];

function isDeniedByPatterns(relativePath: string, patterns: string[]): boolean {
  const normalized = relativePath.split(path.sep).join("/");
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
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

function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.split(path.sep).join("/");
  let output = "^";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      if (normalized[index + 2] === "/") {
        output += "(?:.*/)?";
        index += 2;
      } else {
        output += ".*";
        index += 1;
      }
    } else if (char === "*") {
      output += "[^/]*";
    } else if (char === "?") {
      output += "[^/]";
    } else {
      output += escapeRegExp(char ?? "");
    }
  }

  return new RegExp(`${output}$`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
