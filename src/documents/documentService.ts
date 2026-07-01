import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export interface ManagedDocument {
  id?: string;
  path: string;
  kind?: string;
  status?: string;
  frontmatterError?: string;
}

const ignoredDirectories = new Set([".git", ".engimcp", "node_modules", "dist"]);

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

      documents.push({
        id: frontmatter.data?.id,
        path: relativePath,
        kind: frontmatter.data?.kind,
        status: frontmatter.data?.status,
        frontmatterError: frontmatter.error
      });
    }
  }

  await walk(root);
  return documents;
}
