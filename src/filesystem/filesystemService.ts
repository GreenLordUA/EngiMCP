import { cp, mkdir, readdir, readFile, rename, rm, stat, lstat } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { access } from "node:fs/promises";
import { writeAuditLog } from "../audit/auditLog.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { parseFrontmatter } from "../documents/frontmatter.js";
import { buildGraph } from "../graph/graphBuilder.js";
import { EngiMcpError } from "../mcp/errors.js";
import { assertAbsoluteRoot, isDeniedPath, resolveSafePath } from "../project/pathSafety.js";
import { assertProjectWritable } from "../project/writeGuards.js";
import { rebuildIndex, type RebuildIndexResult } from "../storage/sqlite.js";
import { atomicWrite } from "../utils/atomicWrite.js";

export type FsEntryType = "file" | "dir" | "symlink" | "other";

export interface FsEntry {
  path: string;
  type: FsEntryType;
  size?: number;
  modified?: string;
}

export interface FsListInput {
  root: string;
  path?: string;
  recursive?: boolean;
  include_hidden?: boolean;
}

export interface FsTreeInput {
  root: string;
  path?: string;
  max_depth?: number;
  include_files?: boolean;
  include_dirs?: boolean;
  respect_deny_patterns?: boolean;
}

export interface FsReadInput {
  root: string;
  path: string;
  encoding?: "utf-8";
  max_bytes?: number;
  mode?: "full" | "head" | "tail" | "range" | "metadata_only";
  offset?: number;
  length?: number;
}

export interface FsWriteInput {
  root: string;
  path: string;
  content: string;
  mode?: "create_new" | "overwrite" | "append";
  create_dirs?: boolean;
  dry_run?: boolean;
}

export interface FsMkdirInput {
  root: string;
  path: string;
  parents?: boolean;
  dry_run?: boolean;
}

export interface FsMoveInput {
  root: string;
  source: string;
  target: string;
  update_links?: boolean;
  overwrite?: boolean;
  dry_run?: boolean;
}

export interface FsCopyInput {
  root: string;
  source: string;
  target: string;
  overwrite?: boolean;
  dry_run?: boolean;
}

export interface FsDeleteInput {
  root: string;
  path: string;
  mode?: "trash";
  recursive?: boolean;
  dry_run?: boolean;
  reason?: string;
  force?: boolean;
}

export interface FsExistsInput {
  root: string;
  path: string;
}

export interface FsStatInput {
  root: string;
  path: string;
}

export interface FsGlobInput {
  root: string;
  patterns: string[];
  exclude?: string[];
  limit?: number;
}

const defaultReadLimit = 200_000;
const treeLimit = 1_000;

export async function fsList(input: FsListInput): Promise<{ items: FsEntry[] }> {
  const root = assertAbsoluteRoot(input.root);
  const base = await resolveSafePath(root, input.path ?? ".");
  const baseStat = await stat(base);

  if (!baseStat.isDirectory()) {
    throw new EngiMcpError("NOT_DIRECTORY", `Path is not a directory: ${input.path ?? "."}`);
  }

  const items = await listDirectory(root, base, {
    recursive: input.recursive ?? false,
    includeHidden: input.include_hidden ?? false
  });

  return { items };
}

export async function fsTree(input: FsTreeInput): Promise<{
  root: string;
  path: string;
  items: FsEntry[];
  truncated: boolean;
  warnings: string[];
}> {
  const root = assertAbsoluteRoot(input.root);
  const startPath = input.path ?? ".";
  const base = await resolveSafePath(root, startPath);
  const maxDepth = input.max_depth ?? 4;
  const includeFiles = input.include_files ?? true;
  const includeDirs = input.include_dirs ?? true;
  const items: FsEntry[] = [];
  const warnings: string[] = [];
  let truncated = false;

  async function walk(directory: string, depth: number): Promise<void> {
    if (truncated || depth > maxDepth) {
      return;
    }

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizeRelative(root, absolutePath);
      if (isDeniedPath(relativePath)) {
        continue;
      }
      if (items.length >= treeLimit) {
        truncated = true;
        warnings.push(`Tree output truncated at ${treeLimit} items.`);
        return;
      }

      const entryStat = await lstat(absolutePath);
      const type = entryType(entryStat);
      if ((type === "dir" && includeDirs) || (type !== "dir" && includeFiles)) {
        items.push(toEntry(root, absolutePath, entryStat));
      }
      if (type === "dir" && depth < maxDepth) {
        await walk(absolutePath, depth + 1);
      }
    }
  }

  await walk(base, 1);

  return {
    root,
    path: startPath,
    items,
    truncated,
    warnings
  };
}

export async function fsRead(input: FsReadInput): Promise<{
  path: string;
  type: FsEntryType;
  encoding: "utf-8";
  content?: string;
  size: number;
  truncated: boolean;
}> {
  const root = assertAbsoluteRoot(input.root);
  const absolutePath = await resolveSafePath(root, input.path);
  const fileStat = await stat(absolutePath);
  const type = entryType(fileStat);
  const maxBytes = input.max_bytes ?? defaultReadLimit;

  if (!fileStat.isFile()) {
    throw new EngiMcpError("NOT_FILE", `Path is not a file: ${input.path}`);
  }
  if (input.mode === "metadata_only") {
    return {
      path: normalizeRelative(root, absolutePath),
      type,
      encoding: "utf-8",
      size: fileStat.size,
      truncated: false
    };
  }

  const buffer = await readFile(absolutePath);
  const slice = sliceBuffer(buffer, {
    mode: input.mode ?? "full",
    maxBytes,
    offset: input.offset,
    length: input.length
  });

  return {
    path: normalizeRelative(root, absolutePath),
    type,
    encoding: "utf-8",
    content: slice.buffer.toString("utf8"),
    size: fileStat.size,
    truncated: slice.truncated
  };
}

export async function fsWrite(input: FsWriteInput): Promise<{
  ok: boolean;
  path: string;
  created: boolean;
  changed: boolean;
  diff_summary: string;
  index?: RebuildIndexResult;
  audit_id?: string;
  content?: string;
}> {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const absolutePath = await resolveSafePath(root, input.path);
  const mode = input.mode ?? "create_new";
  const createDirs = input.create_dirs ?? true;
  const exists = await pathExists(absolutePath);

  if (mode === "create_new" && exists) {
    throw new EngiMcpError("ALREADY_EXISTS", `File already exists: ${input.path}`);
  }
  if (!createDirs && !(await pathExists(path.dirname(absolutePath)))) {
    throw new EngiMcpError("PARENT_NOT_FOUND", `Parent directory does not exist: ${input.path}`);
  }

  const before = exists ? await readFile(absolutePath, "utf8") : "";
  const nextContent = mode === "append" ? `${before}${input.content}` : input.content;
  validateManagedMarkdown(nextContent, input.path);
  const diffSummary = summarizeContentChange(before, nextContent, exists);

  if (input.dry_run) {
    return {
      ok: true,
      path: normalizeRelative(root, absolutePath),
      created: !exists,
      changed: before !== nextContent,
      diff_summary: `dry run: ${diffSummary}`,
      content: nextContent
    };
  }

  if (createDirs) {
    await mkdir(path.dirname(absolutePath), { recursive: true });
  }
  await atomicWrite(absolutePath, nextContent);
  const auditId = await writeAuditLog({
    root,
    tool: "engi_fs_write",
    target: normalizeRelative(root, absolutePath),
    operation: mode,
    result: "ok",
    diff_summary: diffSummary
  });

  return {
    ok: true,
    path: normalizeRelative(root, absolutePath),
    created: !exists,
    changed: before !== nextContent,
    diff_summary: diffSummary,
    index: await rebuildIndex(root),
    audit_id: auditId
  };
}

export async function fsMkdir(input: FsMkdirInput): Promise<{
  ok: boolean;
  created_paths: string[];
  index?: RebuildIndexResult;
  audit_id?: string;
}> {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const absolutePath = await resolveSafePath(root, input.path);
  const exists = await pathExists(absolutePath);
  const relativePath = normalizeRelative(root, absolutePath);

  if (input.dry_run) {
    return { ok: true, created_paths: exists ? [] : [relativePath] };
  }

  await mkdir(absolutePath, { recursive: input.parents ?? true });
  const auditId = await writeAuditLog({
    root,
    tool: "engi_fs_mkdir",
    target: relativePath,
    operation: "mkdir",
    result: "ok",
    diff_summary: exists ? "directory already exists" : "directory created"
  });

  return {
    ok: true,
    created_paths: exists ? [] : [relativePath],
    index: await rebuildIndex(root),
    audit_id: auditId
  };
}

export async function fsMove(input: FsMoveInput): Promise<{
  ok: boolean;
  moved: Array<{ from: string; to: string }>;
  links_updated: string[];
  warnings: string[];
  index?: RebuildIndexResult;
  audit_id?: string;
}> {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const sourcePath = await resolveSafePath(root, input.source);
  const targetPath = await resolveSafePath(root, input.target);
  await ensureExists(sourcePath, input.source);
  await ensureTargetPolicy(targetPath, input.target, input.overwrite ?? false);
  const warnings = await managedDocumentWarnings(root, sourcePath);
  const moved = [
    { from: normalizeRelative(root, sourcePath), to: normalizeRelative(root, targetPath) }
  ];
  const linkUpdatePreview = await updateMovedPathLinks(root, moved[0].from, moved[0].to, true);
  if (input.update_links !== true && linkUpdatePreview.length > 0) {
    warnings.push(`Manual link updates required in: ${linkUpdatePreview.join(", ")}`);
  }

  if (input.dry_run) {
    return { ok: true, moved, links_updated: linkUpdatePreview, warnings };
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  if (input.overwrite && (await pathExists(targetPath))) {
    await rm(targetPath, { recursive: true, force: true });
  }
  await rename(sourcePath, targetPath);
  const linksUpdated =
    input.update_links === true
      ? await updateMovedPathLinks(root, moved[0].from, moved[0].to, false)
      : [];
  const auditId = await writeAuditLog({
    root,
    tool: "engi_fs_move",
    target: `${moved[0].from} -> ${moved[0].to}`,
    operation: "move",
    result: "ok",
    diff_summary: "moved 1 path"
  });

  return {
    ok: true,
    moved,
    links_updated: linksUpdated,
    warnings,
    index: await rebuildIndex(root),
    audit_id: auditId
  };
}

export async function fsCopy(input: FsCopyInput): Promise<{
  ok: boolean;
  copied: Array<{ from: string; to: string }>;
  index?: RebuildIndexResult;
  audit_id?: string;
}> {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const sourcePath = await resolveSafePath(root, input.source);
  const targetPath = await resolveSafePath(root, input.target);
  await ensureExists(sourcePath, input.source);
  await ensureTargetPolicy(targetPath, input.target, input.overwrite ?? false);
  const copied = [
    { from: normalizeRelative(root, sourcePath), to: normalizeRelative(root, targetPath) }
  ];

  if (input.dry_run) {
    return { ok: true, copied };
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: input.overwrite ?? false,
    errorOnExist: !(input.overwrite ?? false),
    filter: (source) => !isDeniedPath(normalizeRelative(root, source))
  });
  const auditId = await writeAuditLog({
    root,
    tool: "engi_fs_copy",
    target: `${copied[0].from} -> ${copied[0].to}`,
    operation: "copy",
    result: "ok",
    diff_summary: "copied 1 path"
  });

  return { ok: true, copied, index: await rebuildIndex(root), audit_id: auditId };
}

export async function fsDelete(input: FsDeleteInput): Promise<{
  ok: boolean;
  deleted: Array<{ path: string; mode: "trash"; trash_path: string }>;
  broken_links_created: string[];
  index?: RebuildIndexResult;
  audit_id?: string;
}> {
  const root = assertAbsoluteRoot(input.root);
  await assertProjectWritable(root);
  const absolutePath = await resolveSafePath(root, input.path);
  const sourceStat = await lstat(absolutePath);
  const mode = input.mode ?? "trash";

  if (mode !== "trash") {
    throw new EngiMcpError("INVALID_DELETE_MODE", "Only trash delete is supported in the MVP.");
  }
  if (sourceStat.isDirectory() && !(input.recursive ?? false)) {
    throw new EngiMcpError(
      "RECURSIVE_DELETE_REQUIRED",
      "Directory delete requires recursive=true."
    );
  }

  const relativePath = normalizeRelative(root, absolutePath);
  const brokenLinks = await incomingLinksForManagedDocument(root, absolutePath);
  if (brokenLinks.length > 0 && !(input.force ?? false)) {
    throw new EngiMcpError(
      "BROKEN_LINKS_WOULD_BE_CREATED",
      `Deleting ${relativePath} would break incoming links: ${brokenLinks.join(", ")}`
    );
  }

  const trashPath = path.join(
    ".engimcp",
    "trash",
    new Date().toISOString().slice(0, 10),
    relativePath
  );
  const absoluteTrashPath = await resolveSafePath(root, trashPath);
  const deleted = [
    { path: relativePath, mode, trash_path: normalizeRelative(root, absoluteTrashPath) }
  ];

  if (input.dry_run) {
    return { ok: true, deleted, broken_links_created: brokenLinks };
  }

  await mkdir(path.dirname(absoluteTrashPath), { recursive: true });
  await rename(absolutePath, absoluteTrashPath);
  await appendTrashManifest(root, {
    original_path: relativePath,
    trash_path: normalizeRelative(root, absoluteTrashPath),
    reason: input.reason
  });
  const auditId = await writeAuditLog({
    root,
    tool: "engi_fs_delete",
    target: relativePath,
    operation: "trash",
    result: "ok",
    diff_summary: `moved to ${normalizeRelative(root, absoluteTrashPath)}`
  });

  return {
    ok: true,
    deleted,
    broken_links_created: brokenLinks,
    index: await rebuildIndex(root),
    audit_id: auditId
  };
}

export async function fsExists(input: FsExistsInput): Promise<{
  exists: boolean;
  type?: FsEntryType;
  allowed: boolean;
}> {
  const root = assertAbsoluteRoot(input.root);
  const relative = normalizeInputPath(input.path);
  if (isDeniedPath(relative)) {
    return { exists: false, allowed: false };
  }

  const absolutePath = await resolveSafePath(root, input.path);

  try {
    const fileStat = await lstat(absolutePath);
    return { exists: true, type: entryType(fileStat), allowed: true };
  } catch {
    return { exists: false, allowed: true };
  }
}

export async function fsStat(input: FsStatInput): Promise<{
  path: string;
  type?: FsEntryType;
  size?: number;
  modified?: string;
  is_symlink: boolean;
  denied: boolean;
}> {
  const root = assertAbsoluteRoot(input.root);
  const relative = normalizeInputPath(input.path);
  const denied = isDeniedPath(relative);

  if (denied) {
    return { path: relative, is_symlink: false, denied };
  }

  const absolutePath = await resolveSafePath(root, input.path);
  const fileStat = await lstat(absolutePath);

  return {
    path: normalizeRelative(root, absolutePath),
    type: entryType(fileStat),
    size: fileStat.size,
    modified: fileStat.mtime.toISOString(),
    is_symlink: fileStat.isSymbolicLink(),
    denied
  };
}

export async function fsGlob(input: FsGlobInput): Promise<{
  matches: string[];
  truncated: boolean;
}> {
  const root = assertAbsoluteRoot(input.root);
  const limit = input.limit ?? 200;
  const patterns = input.patterns.map(globToRegExp);
  const exclude = (input.exclude ?? []).map(globToRegExp);
  const matches: string[] = [];
  let truncated = false;

  async function walk(directory: string): Promise<void> {
    if (truncated) {
      return;
    }

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalizeRelative(root, absolutePath);
      if (isDeniedPath(relativePath) || exclude.some((pattern) => pattern.test(relativePath))) {
        continue;
      }

      const entryStat = await lstat(absolutePath);
      if (entryStat.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (patterns.some((pattern) => pattern.test(relativePath))) {
        if (matches.length >= limit) {
          truncated = true;
          return;
        }
        matches.push(relativePath);
      }
    }
  }

  await walk(root);
  return { matches: matches.sort(), truncated };
}

async function listDirectory(
  root: string,
  directory: string,
  options: { recursive: boolean; includeHidden: boolean }
): Promise<FsEntry[]> {
  const items: FsEntry[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!options.includeHidden && entry.name.startsWith(".")) {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    const relativePath = normalizeRelative(root, absolutePath);
    if (isDeniedPath(relativePath)) {
      continue;
    }

    const entryStat = await lstat(absolutePath);
    items.push(toEntry(root, absolutePath, entryStat));
    if (options.recursive && entryStat.isDirectory()) {
      items.push(...(await listDirectory(root, absolutePath, options)));
    }
  }

  return items.sort((left, right) => left.path.localeCompare(right.path));
}

function sliceBuffer(
  buffer: Buffer,
  input: { mode: FsReadInput["mode"]; maxBytes: number; offset?: number; length?: number }
): { buffer: Buffer; truncated: boolean } {
  if (input.mode === "head") {
    return {
      buffer: buffer.subarray(0, input.maxBytes),
      truncated: buffer.length > input.maxBytes
    };
  }
  if (input.mode === "tail") {
    return {
      buffer: buffer.subarray(Math.max(0, buffer.length - input.maxBytes)),
      truncated: buffer.length > input.maxBytes
    };
  }
  if (input.mode === "range") {
    const offset = input.offset ?? 0;
    const length = Math.min(input.length ?? input.maxBytes, input.maxBytes);
    return {
      buffer: buffer.subarray(offset, offset + length),
      truncated: offset + length < buffer.length
    };
  }

  return { buffer: buffer.subarray(0, input.maxBytes), truncated: buffer.length > input.maxBytes };
}

function validateManagedMarkdown(content: string, filePath: string): void {
  if (!filePath.endsWith(".md") || !content.startsWith("---\n")) {
    return;
  }

  const parsed = parseFrontmatter(content);
  if (parsed.error) {
    throw new EngiMcpError("FRONTMATTER_INVALID_AFTER_WRITE", parsed.error);
  }
}

async function managedDocumentWarnings(root: string, absolutePath: string): Promise<string[]> {
  const incomingLinks = await incomingLinksForManagedDocument(root, absolutePath);
  return incomingLinks.length > 0
    ? [`Managed document has incoming links from: ${incomingLinks.join(", ")}`]
    : [];
}

async function updateMovedPathLinks(
  root: string,
  oldPath: string,
  newPath: string,
  dryRun: boolean
): Promise<string[]> {
  const registry = await buildDocumentRegistry(root);
  const changedPaths: string[] = [];

  for (const document of registry.documents) {
    const content = await readFile(document.absolutePath, "utf8");
    const nextContent = content
      .replaceAll(`](${oldPath})`, `](${newPath})`)
      .replaceAll(`](${oldPath}#`, `](${newPath}#`)
      .replaceAll(`[[${oldPath}]]`, `[[${newPath}]]`)
      .replaceAll(`[[${oldPath}|`, `[[${newPath}|`);

    if (nextContent === content) {
      continue;
    }

    changedPaths.push(document.path);
    if (!dryRun) {
      await atomicWrite(document.absolutePath, nextContent);
    }
  }

  return changedPaths.sort();
}

async function incomingLinksForManagedDocument(
  root: string,
  absolutePath: string
): Promise<string[]> {
  if (!absolutePath.endsWith(".md")) {
    return [];
  }

  const registry = await buildDocumentRegistry(root);
  const relativePath = normalizeRelative(root, absolutePath);
  const document = registry.byPath.get(relativePath);
  if (!document?.id) {
    return [];
  }

  const graph = await buildGraph(root);
  return graph.edges
    .filter((edge) => edge.target_id === document.id)
    .map((edge) => edge.source_path)
    .sort();
}

async function appendTrashManifest(
  root: string,
  input: { original_path: string; trash_path: string; reason?: string }
): Promise<void> {
  const manifestPath = path.join(
    root,
    ".engimcp",
    "trash",
    new Date().toISOString().slice(0, 10),
    "manifest.jsonl"
  );
  const existing = (await pathExists(manifestPath)) ? await readFile(manifestPath, "utf8") : "";
  const record = {
    ts: new Date().toISOString(),
    original_path: input.original_path,
    trash_path: input.trash_path,
    reason: input.reason
  };
  await atomicWrite(manifestPath, `${existing}${JSON.stringify(record)}\n`);
}

async function ensureExists(absolutePath: string, inputPath: string): Promise<void> {
  if (!(await pathExists(absolutePath))) {
    throw new EngiMcpError("NOT_FOUND", `Path not found: ${inputPath}`);
  }
}

async function ensureTargetPolicy(
  targetPath: string,
  inputPath: string,
  overwrite: boolean
): Promise<void> {
  if (!overwrite && (await pathExists(targetPath))) {
    throw new EngiMcpError("TARGET_EXISTS", `Target already exists: ${inputPath}`);
  }
}

async function pathExists(absolutePath: string): Promise<boolean> {
  try {
    await access(absolutePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function toEntry(
  root: string,
  absolutePath: string,
  fileStat: Awaited<ReturnType<typeof lstat>>
): FsEntry {
  return {
    path: normalizeRelative(root, absolutePath),
    type: entryType(fileStat),
    size: Number(fileStat.size),
    modified: fileStat.mtime.toISOString()
  };
}

function entryType(fileStat: Awaited<ReturnType<typeof lstat>>): FsEntryType {
  if (fileStat.isSymbolicLink()) {
    return "symlink";
  }
  if (fileStat.isDirectory()) {
    return "dir";
  }
  if (fileStat.isFile()) {
    return "file";
  }
  return "other";
}

function normalizeInputPath(inputPath: string): string {
  return inputPath.split(path.sep).join("/").replace(/^\.\//, "") || ".";
}

function normalizeRelative(root: string, absolutePath: string): string {
  return path.relative(root, absolutePath).split(path.sep).join("/") || ".";
}

function summarizeContentChange(before: string, after: string, existed: boolean): string {
  if (!existed) {
    return `new file, ${after.split(/\r?\n/).length} lines`;
  }
  if (before === after) {
    return "no changes";
  }
  const delta = after.split(/\r?\n/).length - before.split(/\r?\n/).length;
  return delta === 0 ? "content changed" : `${Math.abs(delta)} line count delta`;
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

  return new RegExp(`${output}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
