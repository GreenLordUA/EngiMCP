import { assertAbsoluteRoot } from "../project/pathSafety.js";
import { rebuildFullTextIndex } from "./ftsIndex.js";

export interface SearchProjectInput {
  root: string;
  query: string;
  filters?: {
    kind?: string[];
    status?: string[];
    tags?: string[];
    frontmatter?: Record<string, unknown>;
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
  const index = await rebuildFullTextIndex(root);

  return {
    results: index.search({
      query: input.query,
      kind: input.filters?.kind,
      status: input.filters?.status,
      tags: input.filters?.tags,
      frontmatter: input.filters?.frontmatter,
      limit: input.limit
    })
  };
}
