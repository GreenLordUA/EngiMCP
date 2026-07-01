import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { atomicWrite } from "../utils/atomicWrite.js";
import { assertAbsoluteRoot } from "./pathSafety.js";
import { EngiMcpError } from "../mcp/errors.js";

export interface ProjectInitInput {
  root: string;
  template?: "default";
  force?: boolean;
}

export interface ProjectInitResult {
  ok: boolean;
  created_paths: string[];
  warnings: string[];
}

export async function initProject(input: ProjectInitInput): Promise<ProjectInitResult> {
  const root = assertAbsoluteRoot(input.root);
  const createdPaths: string[] = [];
  const warnings: string[] = [];

  await mkdir(root, { recursive: true });

  const projectConfigPath = path.join(root, "project.yaml");
  if ((await exists(projectConfigPath)) && !input.force) {
    throw new EngiMcpError("PROJECT_EXISTS", "project.yaml already exists.");
  }

  const files: Array<{ relativePath: string; content: string }> = [
    {
      relativePath: "project.yaml",
      content: `project:
  id: ${path.basename(root)}
  name: ${path.basename(root)}
  schema_version: 1.0.0
  source_of_truth: markdown
paths:
  docs: docs
  templates: templates
`
    },
    {
      relativePath: "docs/README.md",
      content: `---
id: DOC-PROJECT-README
kind: overview
status: draft
version: 0.1.0
---

# Project Overview
`
    },
    {
      relativePath: "templates/design_doc.md",
      content: `---
id: DOC-EXAMPLE
kind: design_doc
status: draft
version: 0.1.0
---

# Document Title

## Purpose
`
    }
  ];

  for (const file of files) {
    const target = path.join(root, file.relativePath);
    if ((await exists(target)) && !input.force) {
      warnings.push(`Skipped existing file: ${file.relativePath}`);
      continue;
    }
    await atomicWrite(target, file.content);
    createdPaths.push(file.relativePath);
  }

  await mkdir(path.join(root, ".engimcp"), { recursive: true });
  createdPaths.push(".engimcp/");

  return {
    ok: true,
    created_paths: createdPaths,
    warnings
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
