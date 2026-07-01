import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readDocument } from "../documents/documentService.js";
import { getProjectMap, getProjectStatus } from "../project/projectService.js";
import { validateProject } from "../validation/validator.js";

const projectStatusInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  include_validation_summary: z.boolean().default(true),
  include_git_status: z.boolean().default(true)
};

const projectMapInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  kind: z.array(z.string()).optional(),
  max_depth: z.number().int().positive().optional()
};

const docReadInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  mode: z.enum(["full", "summary", "frontmatter", "headings", "section"]).default("full")
};

const validateProjectInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  checks: z.array(z.string()).optional(),
  severity: z.enum(["error", "warning"]).default("warning")
};

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

export function registerTools(server: McpServer): void {
  server.tool(
    "engi_project_status",
    "Return a concise EngiMCP project status.",
    projectStatusInput,
    async (input) => {
      const status = await getProjectStatus(input);

      return textResult(status);
    }
  );

  server.tool(
    "engi_project_map",
    "Return a tree/map of managed Markdown documents.",
    projectMapInput,
    async (input) => {
      return textResult(await getProjectMap(input));
    }
  );

  server.tool(
    "engi_doc_read",
    "Read a managed Markdown document by ID or path.",
    docReadInput,
    async (input) => {
      return textResult(await readDocument(input.root, input));
    }
  );

  server.tool(
    "engi_validate_project",
    "Validate IDs, frontmatter, and basic document relationships.",
    validateProjectInput,
    async (input) => {
      return textResult(await validateProject(input));
    }
  );
}
