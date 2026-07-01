import { parse } from "yaml";
import { stringify } from "yaml";

export interface FrontmatterData {
  id?: string;
  kind?: string;
  status?: string;
  version?: string;
  [key: string]: unknown;
}

export interface ParsedFrontmatter {
  data?: FrontmatterData;
  body: string;
  error?: string;
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  if (!content.startsWith("---\n")) {
    return { body: content };
  }

  const closingDelimiter = content.match(/\n---\s*(?:\r?\n|$)/);
  if (!closingDelimiter?.index) {
    return {
      body: content,
      error: "Missing closing frontmatter delimiter."
    };
  }

  const raw = content.slice(4, closingDelimiter.index);
  const body = content.slice(closingDelimiter.index + closingDelimiter[0].length);

  try {
    const parsed = parse(raw) as FrontmatterData | null;
    return { data: parsed ?? {}, body };
  } catch (error) {
    return {
      body,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function serializeDocument(frontmatter: Record<string, unknown>, body: string): string {
  return `---\n${stringify(frontmatter).trimEnd()}\n---\n\n${body.trimStart()}`;
}
