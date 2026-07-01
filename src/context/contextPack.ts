import { readFile } from "node:fs/promises";
import { buildDocumentRegistry } from "../documents/documentService.js";
import { queryGraph } from "../graph/graphBuilder.js";
import { assertAbsoluteRoot } from "../project/pathSafety.js";
import { validateProject } from "../validation/validator.js";
import { estimateTokens } from "./tokenBudget.js";

export interface ContextPackInput {
  root: string;
  task: string;
  seed_ids?: string[];
  max_tokens?: number;
  include_sections?: boolean;
  include_decisions?: boolean;
  include_open_tasks?: boolean;
  include_validation?: boolean;
}

export interface ContextPackItem {
  id?: string;
  path: string;
  kind?: string;
  reason: string;
  content_mode: "full" | "section";
  content: string;
}

export interface ContextPackResult {
  pack_id: string;
  task: string;
  estimated_tokens: number;
  items: ContextPackItem[];
  excluded: Array<{ id?: string; path: string; reason: string }>;
  warnings: string[];
}

export async function buildContextPack(input: ContextPackInput): Promise<ContextPackResult> {
  const root = assertAbsoluteRoot(input.root);
  const maxTokens = input.max_tokens ?? 12000;
  const registry = await buildDocumentRegistry(root);
  const reasons = new Map<string, string>();
  const excluded: ContextPackResult["excluded"] = [];
  const warnings: string[] = [];

  for (const id of input.seed_ids ?? []) {
    const document = registry.byId.get(id);
    if (document) {
      reasons.set(document.path, "seed document");
    } else {
      warnings.push(`Seed document not found: ${id}`);
    }
  }

  for (const id of input.seed_ids ?? []) {
    const graph = await queryGraph({ root, id, direction: "both", depth: 1 });
    for (const node of graph.nodes) {
      const document = registry.byId.get(node.id);
      if (document && !reasons.has(document.path)) {
        reasons.set(document.path, `graph neighbor of ${id}`);
      }
    }
  }

  const taskTerms = normalizedTerms(input.task);
  for (const document of registry.documents) {
    if (reasons.has(document.path)) {
      continue;
    }
    const content = await readFile(document.absolutePath, "utf8");
    if (taskTerms.some((term) => content.toLowerCase().includes(term))) {
      reasons.set(document.path, "matched task terms");
    }
  }

  const matchedTaskDocuments = registry.documents.filter(
    (document) => document.id && reasons.get(document.path) === "matched task terms"
  );
  for (const document of matchedTaskDocuments) {
    const graph = await queryGraph({ root, id: document.id ?? "", direction: "both", depth: 1 });
    for (const node of graph.nodes) {
      const neighbor = registry.byId.get(node.id);
      if (neighbor && !reasons.has(neighbor.path)) {
        reasons.set(neighbor.path, `graph neighbor of ${document.id}`);
      } else if (neighbor && reasons.get(neighbor.path) === "matched task terms") {
        reasons.set(neighbor.path, `matched task terms; graph neighbor of ${document.id}`);
      }
    }
  }

  const items: ContextPackItem[] = [];
  let estimatedTokens = 0;

  for (const document of registry.documents) {
    const reason = reasons.get(document.path);
    if (!reason) {
      continue;
    }

    if (document.status === "superseded") {
      excluded.push({ id: document.id, path: document.path, reason: "superseded" });
      continue;
    }

    if (input.include_decisions === false && document.kind === "decision") {
      excluded.push({ id: document.id, path: document.path, reason: "decisions excluded" });
      continue;
    }

    if (input.include_open_tasks === false && document.kind === "task") {
      excluded.push({ id: document.id, path: document.path, reason: "open tasks excluded" });
      continue;
    }

    const fullContent = await readFile(document.absolutePath, "utf8");
    const sectionContent =
      input.include_sections === false ? undefined : selectRelevantSection(fullContent, taskTerms);
    const content = sectionContent ?? fullContent;
    const tokens = estimateTokens(content);
    if (estimatedTokens + tokens > maxTokens) {
      excluded.push({ id: document.id, path: document.path, reason: "token budget exceeded" });
      continue;
    }

    estimatedTokens += tokens;
    items.push({
      id: document.id,
      path: document.path,
      kind: document.kind,
      reason,
      content_mode: sectionContent ? "section" : "full",
      content
    });
  }

  if (input.include_validation ?? true) {
    const validation = await validateProject({ root });
    warnings.push(
      ...validation.errors.map((error) => `${error.code}: ${error.message}`),
      ...validation.warnings.map((warning) => `${warning.code}: ${warning.message}`)
    );
  }

  return {
    pack_id: `CTX-${new Date().toISOString().replace(/[-:.TZ]/g, "")}`,
    task: input.task,
    estimated_tokens: estimatedTokens,
    items,
    excluded,
    warnings
  };
}

function normalizedTerms(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4);
}

function selectRelevantSection(markdown: string, terms: string[]): string | undefined {
  if (terms.length === 0) {
    return undefined;
  }

  const lines = markdown.split(/\r?\n/);
  const sections: Array<{ start: number; end: number }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index]?.match(/^(#{1,6})\s+/);
    if (!heading) {
      continue;
    }

    const level = heading[1].length;
    let end = lines.length;
    for (let next = index + 1; next < lines.length; next += 1) {
      const nextHeading = lines[next]?.match(/^(#{1,6})\s+/);
      if (nextHeading && nextHeading[1].length <= level) {
        end = next;
        break;
      }
    }
    sections.push({ start: index, end });
  }

  for (const section of sections) {
    const content = lines.slice(section.start, section.end).join("\n").trim();
    const lower = content.toLowerCase();
    if (terms.some((term) => lower.includes(term))) {
      return content;
    }
  }

  return undefined;
}
