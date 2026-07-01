import { readFile } from "node:fs/promises";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { assertAbsoluteRoot } from "../project/pathSafety.js";

export interface FullTextIndexDocument {
  id?: string;
  path: string;
  kind?: string;
  status?: string;
  tags: string[];
  frontmatter: Record<string, unknown>;
  content: string;
  lowerContent: string;
}

export interface FullTextSearchOptions {
  query: string;
  kind?: string[];
  status?: string[];
  tags?: string[];
  frontmatter?: Record<string, unknown>;
  limit?: number;
}

export interface FullTextSearchResult {
  id?: string;
  path: string;
  score: number;
  snippet: string;
}

export interface FullTextIndex {
  documents: FullTextIndexDocument[];
  search(options: FullTextSearchOptions): FullTextSearchResult[];
}

export async function rebuildFullTextIndex(rootInput: string): Promise<FullTextIndex> {
  const root = assertAbsoluteRoot(rootInput);
  const registry = await buildDocumentRegistry(root);
  const documents = await Promise.all(
    registry.documents.map(async (document) => {
      const content = await readFile(document.absolutePath, "utf8");
      return {
        id: document.id,
        path: document.path,
        kind: document.kind,
        status: document.status,
        tags: extractStringList(document.frontmatter.tags),
        frontmatter: document.frontmatter,
        content,
        lowerContent: content.toLowerCase()
      };
    })
  );

  return {
    documents,
    search(options) {
      return searchIndex(documents, options);
    }
  };
}

function searchIndex(
  documents: FullTextIndexDocument[],
  options: FullTextSearchOptions
): FullTextSearchResult[] {
  const terms = normalizedTerms(options.query);
  const kindFilter = options.kind ? new Set(options.kind) : undefined;
  const statusFilter = options.status ? new Set(options.status) : undefined;
  const tagFilter = options.tags ? new Set(options.tags) : undefined;
  const results: FullTextSearchResult[] = [];

  for (const document of documents) {
    if (kindFilter && (!document.kind || !kindFilter.has(document.kind))) {
      continue;
    }
    if (statusFilter && (!document.status || !statusFilter.has(document.status))) {
      continue;
    }
    if (tagFilter && !document.tags.some((tag) => tagFilter.has(tag))) {
      continue;
    }
    if (options.frontmatter && !frontmatterMatches(document.frontmatter, options.frontmatter)) {
      continue;
    }

    const textScore = terms.reduce(
      (sum, term) => sum + countOccurrences(document.lowerContent, term),
      0
    );
    const idScore = terms.some((term) => document.id?.toLowerCase().includes(term)) ? 5 : 0;
    const totalScore = textScore + idScore;
    if (totalScore === 0) {
      continue;
    }

    results.push({
      id: document.id,
      path: document.path,
      score: totalScore,
      snippet: makeSnippet(document.content, terms)
    });
  }

  return results
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, options.limit ?? 20);
}

function frontmatterMatches(
  frontmatter: Record<string, unknown>,
  filters: Record<string, unknown>
): boolean {
  return Object.entries(filters).every(([key, expected]) => {
    const actual = frontmatter[key];
    if (Array.isArray(actual)) {
      return actual.some((item) => item === expected);
    }
    return actual === expected;
  });
}

function extractStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" ? [value] : [];
}

function normalizedTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function countOccurrences(content: string, term: string): number {
  return content.split(term).length - 1;
}

function makeSnippet(content: string, terms: string[]): string {
  const lowerContent = content.toLowerCase();
  const index =
    terms.map((term) => lowerContent.indexOf(term)).find((position) => position >= 0) ?? 0;
  const start = Math.max(0, index - 60);
  return content
    .slice(start, start + 160)
    .replace(/\s+/g, " ")
    .trim();
}
