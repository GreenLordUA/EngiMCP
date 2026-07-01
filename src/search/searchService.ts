import { readFile } from "node:fs/promises";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { assertAbsoluteRoot } from "../project/pathSafety.js";

export interface SearchProjectInput {
  root: string;
  query: string;
  filters?: {
    kind?: string[];
    status?: string[];
  };
  limit?: number;
}

export interface SearchResult {
  id?: string;
  path: string;
  score: number;
  snippet: string;
}

export async function searchProject(
  input: SearchProjectInput
): Promise<{ results: SearchResult[] }> {
  const root = assertAbsoluteRoot(input.root);
  const registry = await buildDocumentRegistry(root);
  const terms = input.query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const kindFilter = input.filters?.kind ? new Set(input.filters.kind) : undefined;
  const statusFilter = input.filters?.status ? new Set(input.filters.status) : undefined;

  const results: SearchResult[] = [];
  for (const document of registry.documents) {
    if (kindFilter && (!document.kind || !kindFilter.has(document.kind))) {
      continue;
    }
    if (statusFilter && (!document.status || !statusFilter.has(document.status))) {
      continue;
    }

    const content = await readFile(document.absolutePath, "utf8");
    const lowerContent = content.toLowerCase();
    const score = terms.reduce((sum, term) => sum + countOccurrences(lowerContent, term), 0);
    const idScore = terms.some((term) => document.id?.toLowerCase().includes(term)) ? 5 : 0;
    const totalScore = score + idScore;
    if (totalScore === 0) {
      continue;
    }

    results.push({
      id: document.id,
      path: document.path,
      score: totalScore,
      snippet: makeSnippet(content, terms)
    });
  }

  return {
    results: results
      .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
      .slice(0, input.limit ?? 20)
  };
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
