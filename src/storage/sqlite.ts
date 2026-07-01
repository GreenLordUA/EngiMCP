import { access, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import initSqlJs from "sql.js";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { buildGraph } from "../graph/graphBuilder.js";
import { validateProject } from "../validation/validator.js";

const require = createRequire(import.meta.url);

export interface RebuildIndexResult {
  ok: boolean;
  path: string;
  documents: number;
  relations: number;
  validation_issues: number;
}

export interface EnsureIndexResult {
  ok: boolean;
  path: string;
  rebuilt: boolean;
  index?: RebuildIndexResult;
}

export async function ensureIndex(root: string): Promise<EnsureIndexResult> {
  const indexPath = path.join(root, ".engimcp/index.sqlite");
  try {
    await access(indexPath);
    return { ok: true, path: ".engimcp/index.sqlite", rebuilt: false };
  } catch {
    const index = await rebuildIndex(root);
    return { ok: true, path: index.path, rebuilt: true, index };
  }
}

export async function rebuildIndex(root: string): Promise<RebuildIndexResult> {
  const SQL = await initSqlJs({
    locateFile: locateSqlJsFile
  });
  const registry = await buildDocumentRegistry(root);
  const graph = await buildGraph(root);
  const validation = await validateProject({ root });
  const db = new SQL.Database();

  db.run(`
    create table documents(id text, path text, kind text, status text, version text, title text, summary text);
    create table relations(source_id text, relation_type text, target_id text, source_path text);
    create table validation_issues(severity text, code text, message text, path text, entity_id text);
  `);

  for (const document of registry.documents) {
    db.run("insert into documents values (?, ?, ?, ?, ?, ?, ?)", [
      document.id ?? null,
      document.path,
      document.kind ?? null,
      document.status ?? null,
      document.version ?? null,
      document.title ?? null,
      document.summary ?? null
    ]);
  }

  for (const edge of graph.edges) {
    db.run("insert into relations values (?, ?, ?, ?)", [
      edge.source_id,
      edge.relation_type,
      edge.target_id,
      edge.source_path
    ]);
  }

  for (const issue of validation.errors) {
    db.run("insert into validation_issues values (?, ?, ?, ?, ?)", [
      "error",
      issue.code,
      issue.message,
      issue.path ?? null,
      issue.entity_id ?? null
    ]);
  }

  for (const issue of validation.warnings) {
    db.run("insert into validation_issues values (?, ?, ?, ?, ?)", [
      "warning",
      issue.code,
      issue.message,
      issue.path ?? null,
      issue.entity_id ?? null
    ]);
  }

  const indexPath = path.join(root, ".engimcp/index.sqlite");
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, Buffer.from(db.export()));
  db.close();

  return {
    ok: true,
    path: ".engimcp/index.sqlite",
    documents: registry.documents.length,
    relations: graph.edges.length,
    validation_issues: validation.errors.length + validation.warnings.length
  };
}

export function locateSqlJsFile(file: string): string {
  return require.resolve(`sql.js/dist/${file}`);
}
