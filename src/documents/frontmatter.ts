import { parse } from "yaml";

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

  const end = content.indexOf("\n---", 4);
  if (end === -1) {
    return {
      body: content,
      error: "Missing closing frontmatter delimiter."
    };
  }

  const raw = content.slice(4, end);
  const body = content.slice(end + 4).replace(/^\r?\n/, "");

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
