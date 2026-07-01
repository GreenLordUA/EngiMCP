import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { parseHeadings, type Heading } from "./headings.js";
import { resolveInsideRoot } from "../project/pathSafety.js";
import { EngiMcpError } from "../mcp/errors.js";

export interface ManagedDocument {
  id?: string;
  path: string;
  absolutePath: string;
  kind?: string;
  status?: string;
  version?: string;
  title?: string;
  summary?: string;
  frontmatter: Record<string, unknown>;
  headings: Heading[];
  frontmatterError?: string;
}

export interface DocumentRegistry {
  documents: ManagedDocument[];
  byId: Map<string, ManagedDocument>;
  byPath: Map<string, ManagedDocument>;
}

export interface DocumentReadInput {
  id?: string | null;
  path?: string | null;
  mode?: "full" | "summary" | "frontmatter" | "headings" | "section";
}

export interface DocumentReadResult {
  id?: string;
  path: string;
  frontmatter: Record<string, unknown>;
  content?: string;
  headings?: string[];
  links: string[];
}

const ignoredDirectories = new Set([".git", ".engimcp", "node_modules", "dist"]);
const relationFields = [
  "depends_on",
  "impacts",
  "satisfies",
  "verified_by",
  "verifies",
  "decided_by",
  "updates",
  "supersedes",
  "relates_to",
  "blocks",
  "derives_from"
];

export async function discoverMarkdownDocuments(root: string): Promise<ManagedDocument[]> {
  const documents: ManagedDocument[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await walk(path.join(directory, entry.name));
        }
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);
      const content = await readFile(absolutePath, "utf8");
      const frontmatter = parseFrontmatter(content);
      const data = frontmatter.data ?? {};

      documents.push({
        id: data.id,
        path: relativePath,
        absolutePath,
        kind: data.kind,
        status: data.status,
        version: data.version,
        title: typeof data.title === "string" ? data.title : undefined,
        summary: typeof data.summary === "string" ? data.summary : undefined,
        frontmatter: data,
        headings: parseHeadings(frontmatter.body),
        frontmatterError: frontmatter.error
      });
    }
  }

  await walk(root);
  return documents;
}

export async function buildDocumentRegistry(root: string): Promise<DocumentRegistry> {
  const documents = await discoverMarkdownDocuments(root);
  const byId = new Map<string, ManagedDocument>();
  const byPath = new Map<string, ManagedDocument>();

  for (const document of documents) {
    if (document.id && !byId.has(document.id)) {
      byId.set(document.id, document);
    }
    byPath.set(document.path, document);
  }

  return { documents, byId, byPath };
}

export async function readDocument(
  root: string,
  input: DocumentReadInput
): Promise<DocumentReadResult> {
  const registry = await buildDocumentRegistry(root);
  const document = resolveDocument(registry, input);
  const content = await readFile(resolveInsideRoot(root, document.path), "utf8");
  const parsed = parseFrontmatter(content);
  const mode = input.mode ?? "full";

  const result: DocumentReadResult = {
    id: document.id,
    path: document.path,
    frontmatter: parsed.data ?? {},
    links: extractFrontmatterLinks(parsed.data ?? {})
  };

  if (mode === "frontmatter") {
    return result;
  }

  if (mode === "headings") {
    return {
      ...result,
      headings: parseHeadings(parsed.body).map(formatHeading)
    };
  }

  if (mode === "summary") {
    return {
      ...result,
      content: document.summary ?? firstParagraph(parsed.body)
    };
  }

  if (mode === "section") {
    throw new EngiMcpError("NOT_IMPLEMENTED", "Section reads are not implemented in Milestone 1.");
  }

  return {
    ...result,
    content: content,
    headings: parseHeadings(parsed.body).map(formatHeading)
  };
}

export function extractFrontmatterLinks(frontmatter: Record<string, unknown>): string[] {
  return relationFields.flatMap((field) => {
    const value = frontmatter[field];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    return typeof value === "string" ? [value] : [];
  });
}

function resolveDocument(registry: DocumentRegistry, input: DocumentReadInput): ManagedDocument {
  if (input.id) {
    const document = registry.byId.get(input.id);
    if (!document) {
      throw new EngiMcpError("DOCUMENT_NOT_FOUND", `Document id not found: ${input.id}`);
    }
    return document;
  }

  if (input.path) {
    const normalizedPath = path.normalize(input.path);
    const document = registry.byPath.get(normalizedPath);
    if (!document) {
      throw new EngiMcpError("DOCUMENT_NOT_FOUND", `Document path not found: ${input.path}`);
    }
    return document;
  }

  throw new EngiMcpError("DOCUMENT_SELECTOR_REQUIRED", "Provide either document id or path.");
}

function formatHeading(heading: Heading): string {
  return `${"#".repeat(heading.level)} ${heading.text}`;
}

function firstParagraph(markdown: string): string {
  return (
    markdown
      .split(/\r?\n\r?\n/)
      .map((part) => part.trim())
      .find((part) => part.length > 0 && !part.startsWith("#")) ?? ""
  );
}
