import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createBomItem } from "../bom/bomService.js";
import { buildContextPack } from "../context/contextPack.js";
import { createDecision } from "../decisions/decisionService.js";
import {
  addDocumentRelationship,
  createDocument,
  patchDocumentFrontmatter,
  patchDocumentSection,
  readDocument
} from "../documents/documentService.js";
import { queryGraph } from "../graph/graphBuilder.js";
import { analyzeImpact } from "../graph/impact.js";
import { relationTypes } from "../graph/relations.js";
import { createGitCommit, createProjectSnapshot, getGitStatus } from "../git/gitAdapter.js";
import { initProject } from "../project/projectInit.js";
import { getProjectMap, getProjectStatus } from "../project/projectService.js";
import { createRequirement } from "../requirements/requirementService.js";
import { searchProject } from "../search/searchService.js";
import { rebuildIndex } from "../storage/sqlite.js";
import { createTask } from "../tasks/taskService.js";
import { validateProject } from "../validation/validator.js";
import { createTestReport } from "../verification/testReportService.js";

const projectStatusInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  include_validation_summary: z.boolean().default(true),
  include_git_status: z.boolean().default(true)
};

const projectInitInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  template: z.enum(["default"]).default("default"),
  force: z.boolean().default(false)
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
  kind: z.string().nullable().optional(),
  heading_path: z.array(z.string()).nullable().optional(),
  mode: z.enum(["full", "summary", "frontmatter", "headings", "section"]).default("full")
};

const docCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  kind: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  template: z.string().default("design_doc"),
  frontmatter: z.record(z.string(), z.unknown()).optional(),
  dry_run: z.boolean().default(false)
};

const frontmatterPatchInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  patch: z.record(z.string(), z.unknown()),
  dry_run: z.boolean().default(false)
};

const docPatchSectionInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  heading_path: z.array(z.string().min(1)).min(1),
  operation: z.enum(["replace", "append", "prepend", "insert_after"]).default("replace"),
  content: z.string(),
  dry_run: z.boolean().default(false)
};

const docAddRelationshipInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  relation_type: z.enum(relationTypes),
  target_id: z.string().min(1),
  dry_run: z.boolean().default(false)
};

const validateProjectInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  checks: z.array(z.string()).optional(),
  severity: z.enum(["error", "warning"]).default("warning")
};

const graphQueryInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
  depth: z.number().int().positive().default(1),
  relation_types: z.array(z.enum(relationTypes)).optional()
};

const impactAnalyzeInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  changed_ids: z.array(z.string().min(1)).min(1),
  change_description: z.string().optional(),
  depth: z.number().int().positive().default(2)
};

const requirementCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  requirement_type: z.enum(["functional", "non_functional", "security", "acceptance"]),
  title: z.string().min(1),
  statement: z.string().min(1),
  priority: z.enum(["must", "should", "could", "wont"]),
  rationale: z.string().optional(),
  related: z.array(z.string()).optional(),
  dry_run: z.boolean().default(false)
};

const decisionCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  title: z.string().min(1),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"]).default("proposed"),
  context: z.string().min(1),
  options: z.array(z.string()).min(1),
  decision: z.string().min(1),
  consequences: z.string().min(1),
  related_requirements: z.array(z.string()).optional(),
  impacts: z.array(z.string()).optional(),
  dry_run: z.boolean().default(false)
};

const taskCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  title: z.string().min(1),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  related: z.array(z.string()).optional(),
  due: z.string().nullable().optional(),
  dry_run: z.boolean().default(false)
};

const contextPackInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  task: z.string().min(1),
  seed_ids: z.array(z.string()).optional(),
  max_tokens: z.number().int().positive().default(12000),
  include_sections: z.boolean().default(true),
  include_decisions: z.boolean().default(true),
  include_open_tasks: z.boolean().default(true),
  include_validation: z.boolean().default(true)
};

const gitStatusInput = {
  root: z.string().min(1).describe("Absolute path to the project root.")
};

const projectSnapshotInput = {
  root: z.string().min(1).describe("Absolute path to the project root.")
};

const gitCommitInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  message: z.string().min(1)
};

const searchInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  query: z.string().min(1),
  filters: z
    .object({
      kind: z.array(z.string()).optional(),
      status: z.array(z.string()).optional()
    })
    .optional(),
  limit: z.number().int().positive().default(20)
};

const rebuildIndexInput = {
  root: z.string().min(1).describe("Absolute path to the project root.")
};

const testReportCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  title: z.string().min(1),
  verifies: z.array(z.string().min(1)).min(1),
  result: z.enum(["pass", "fail", "blocked"]),
  dry_run: z.boolean().default(false)
};

const bomItemCreateInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  id: z.string().min(1),
  part_name: z.string().min(1),
  quantity: z.number().positive(),
  status: z.enum(["candidate", "approved", "rejected"]).default("candidate"),
  source: z.string().optional(),
  unit_cost: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  related: z.array(z.string().min(1)).optional(),
  dry_run: z.boolean().default(false)
};

function textResult(value: unknown) {
  const result: {
    structuredContent?: Record<string, unknown>;
    content: Array<{ type: "text"; text: string }>;
  } = {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    result.structuredContent = value as Record<string, unknown>;
  }

  return result;
}

export function registerTools(server: McpServer): void {
  server.tool(
    "engi_project_init",
    "Create a new EngiMCP project structure.",
    projectInitInput,
    async (input) => {
      return textResult(await initProject(input));
    }
  );

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
    "engi_doc_create",
    "Create a Markdown document from a template.",
    docCreateInput,
    async (input) => {
      return textResult(await createDocument(input));
    }
  );

  server.tool(
    "engi_frontmatter_patch",
    "Patch YAML frontmatter for a managed document.",
    frontmatterPatchInput,
    async (input) => {
      return textResult(await patchDocumentFrontmatter(input));
    }
  );

  server.tool(
    "engi_doc_patch_section",
    "Patch a Markdown section by heading path.",
    docPatchSectionInput,
    async (input) => {
      return textResult(await patchDocumentSection(input));
    }
  );

  server.tool(
    "engi_doc_add_relationship",
    "Add a frontmatter relationship to a managed document.",
    docAddRelationshipInput,
    async (input) => {
      return textResult(await addDocumentRelationship(input));
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

  server.tool(
    "engi_graph_query",
    "Return graph neighbors for a document or entity.",
    graphQueryInput,
    async (input) => {
      return textResult(await queryGraph(input));
    }
  );

  server.tool(
    "engi_impact_analyze",
    "Analyze transitive document impact for changed IDs.",
    impactAnalyzeInput,
    async (input) => {
      return textResult(await analyzeImpact(input));
    }
  );

  server.tool(
    "engi_requirement_create",
    "Create a requirement document with the next typed requirement ID.",
    requirementCreateInput,
    async (input) => {
      return textResult(await createRequirement(input));
    }
  );

  server.tool(
    "engi_decision_create",
    "Create an Engineering Decision Record.",
    decisionCreateInput,
    async (input) => {
      return textResult(await createDecision(input));
    }
  );

  server.tool(
    "engi_task_create",
    "Create a project task document.",
    taskCreateInput,
    async (input) => {
      return textResult(await createTask(input));
    }
  );

  server.tool(
    "engi_context_pack",
    "Build compact task-specific context from project documents.",
    contextPackInput,
    async (input) => {
      return textResult(await buildContextPack(input));
    }
  );

  server.tool(
    "engi_git_status",
    "Return Git dirty status and changed files.",
    gitStatusInput,
    async (input) => {
      return textResult(await getGitStatus(input.root));
    }
  );

  server.tool(
    "engi_project_snapshot",
    "Create a local snapshot of project files before risky changes.",
    projectSnapshotInput,
    async (input) => {
      return textResult(await createProjectSnapshot(input.root));
    }
  );

  server.tool(
    "engi_git_commit",
    "Create a Git commit for current project changes.",
    gitCommitInput,
    async (input) => {
      return textResult(await createGitCommit(input.root, input.message));
    }
  );

  server.tool("engi_search", "Search managed Markdown documents.", searchInput, async (input) => {
    return textResult(await searchProject(input));
  });

  server.tool(
    "engi_rebuild_index",
    "Rebuild the derived SQLite project index.",
    rebuildIndexInput,
    async (input) => {
      return textResult(await rebuildIndex(input.root));
    }
  );

  server.tool(
    "engi_test_report_create",
    "Create a test report linked to verified requirements.",
    testReportCreateInput,
    async (input) => {
      return textResult(await createTestReport(input));
    }
  );

  server.tool(
    "engi_bom_item_create",
    "Create a BOM item document linked to related entities.",
    bomItemCreateInput,
    async (input) => {
      return textResult(await createBomItem(input));
    }
  );
}
