import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
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
import {
  fsCopy,
  fsDelete,
  fsExists,
  fsGlob,
  fsList,
  fsMkdir,
  fsMove,
  fsRead,
  fsStat,
  fsTree,
  fsWrite
} from "../filesystem/filesystemService.js";
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
      status: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      frontmatter: z.record(z.string(), z.unknown()).optional()
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

const fsTreeInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().default("."),
  max_depth: z.number().int().positive().default(4),
  include_files: z.boolean().default(true),
  include_dirs: z.boolean().default(true),
  respect_deny_patterns: z.boolean().default(true)
};

const fsListInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().default("."),
  recursive: z.boolean().default(false),
  include_hidden: z.boolean().default(false)
};

const fsReadInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1),
  encoding: z.enum(["utf-8"]).default("utf-8"),
  max_bytes: z.number().int().positive().default(200000),
  mode: z.enum(["full", "head", "tail", "range", "metadata_only"]).default("full"),
  offset: z.number().int().nonnegative().optional(),
  length: z.number().int().positive().optional()
};

const fsWriteInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1),
  content: z.string(),
  mode: z.enum(["create_new", "overwrite", "append"]).default("create_new"),
  create_dirs: z.boolean().default(true),
  dry_run: z.boolean().default(false)
};

const fsMkdirInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1),
  parents: z.boolean().default(true),
  dry_run: z.boolean().default(false)
};

const fsMoveInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  source: z.string().min(1),
  target: z.string().min(1),
  update_links: z.boolean().default(false),
  overwrite: z.boolean().default(false),
  dry_run: z.boolean().default(false)
};

const fsCopyInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  source: z.string().min(1),
  target: z.string().min(1),
  overwrite: z.boolean().default(false),
  dry_run: z.boolean().default(false)
};

const fsDeleteInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1),
  mode: z.enum(["trash"]).default("trash"),
  recursive: z.boolean().default(false),
  dry_run: z.boolean().default(false),
  reason: z.string().optional(),
  force: z.boolean().default(false)
};

const fsExistsInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1)
};

const fsStatInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  path: z.string().min(1)
};

const fsGlobInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  patterns: z.array(z.string().min(1)).min(1),
  exclude: z.array(z.string().min(1)).optional(),
  limit: z.number().int().positive().default(200)
};

function textResult(value: unknown): CallToolResult {
  const result: CallToolResult = {
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

const genericOutputSchema = {
  audit_id: z.string().optional(),
  broken_links_created: z.array(z.string()).optional(),
  changed: z.boolean().optional(),
  commit: z.string().optional(),
  content: z.unknown().optional(),
  copied: z.unknown().optional(),
  created: z.boolean().optional(),
  created_paths: z.array(z.string()).optional(),
  decisions: z.number().optional(),
  deleted: z.unknown().optional(),
  diff_summary: z.string().optional(),
  dirty: z.boolean().optional(),
  documents: z.number().optional(),
  edges: z.unknown().optional(),
  errors: z.unknown().optional(),
  estimated_tokens: z.number().optional(),
  excluded: z.unknown().optional(),
  exists: z.boolean().optional(),
  files: z.unknown().optional(),
  frontmatter: z.unknown().optional(),
  git: z.unknown().optional(),
  headings: z.unknown().optional(),
  id: z.string().optional(),
  impact: z.unknown().optional(),
  index: z.unknown().optional(),
  is_git_repo: z.boolean().optional(),
  items: z.unknown().optional(),
  links: z.unknown().optional(),
  links_updated: z.unknown().optional(),
  matches: z.array(z.string()).optional(),
  message: z.string().optional(),
  moved: z.unknown().optional(),
  nodes: z.unknown().optional(),
  ok: z.boolean().optional(),
  pack_id: z.string().optional(),
  path: z.string().optional(),
  project_id: z.string().optional(),
  recommended_actions: z.unknown().optional(),
  recommended_reads: z.unknown().optional(),
  relations: z.number().optional(),
  requirements: z.number().optional(),
  results: z.unknown().optional(),
  root: z.string().optional(),
  size: z.number().optional(),
  status: z.unknown().optional(),
  summary: z.string().optional(),
  task: z.string().optional(),
  tasks_open: z.number().optional(),
  trash_path: z.string().optional(),
  truncated: z.boolean().optional(),
  type: z.string().optional(),
  validation: z.unknown().optional(),
  validation_issues: z.number().optional(),
  warnings: z.unknown().optional()
};

function registerStructuredTool<Args extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: Args,
  handler: (
    input: z.output<z.ZodObject<Args>>
  ) => ReturnType<typeof textResult> | Promise<ReturnType<typeof textResult>>
): void {
  server.registerTool(
    name,
    {
      description,
      inputSchema,
      outputSchema: genericOutputSchema
    },
    (async (input: unknown) =>
      handler(input as z.output<z.ZodObject<Args>>)) as unknown as ToolCallback<Args>
  );
}

export function registerTools(server: McpServer): void {
  registerStructuredTool(
    server,
    "engi_project_init",
    "Create a new EngiMCP project structure.",
    projectInitInput,
    async (input) => {
      return textResult(await initProject(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_project_status",
    "Return a concise EngiMCP project status.",
    projectStatusInput,
    async (input) => {
      const status = await getProjectStatus(input);

      return textResult(status);
    }
  );

  registerStructuredTool(
    server,
    "engi_project_map",
    "Return a tree/map of managed Markdown documents.",
    projectMapInput,
    async (input) => {
      return textResult(await getProjectMap(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_doc_read",
    "Read a managed Markdown document by ID or path.",
    docReadInput,
    async (input) => {
      return textResult(await readDocument(input.root, input));
    }
  );

  registerStructuredTool(
    server,
    "engi_doc_create",
    "Create a Markdown document from a template.",
    docCreateInput,
    async (input) => {
      return textResult(await createDocument(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_frontmatter_patch",
    "Patch YAML frontmatter for a managed document.",
    frontmatterPatchInput,
    async (input) => {
      return textResult(await patchDocumentFrontmatter(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_doc_patch_section",
    "Patch a Markdown section by heading path.",
    docPatchSectionInput,
    async (input) => {
      return textResult(await patchDocumentSection(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_doc_add_relationship",
    "Add a frontmatter relationship to a managed document.",
    docAddRelationshipInput,
    async (input) => {
      return textResult(await addDocumentRelationship(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_validate_project",
    "Validate IDs, frontmatter, and basic document relationships.",
    validateProjectInput,
    async (input) => {
      return textResult(await validateProject(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_graph_query",
    "Return graph neighbors for a document or entity.",
    graphQueryInput,
    async (input) => {
      return textResult(await queryGraph(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_impact_analyze",
    "Analyze transitive document impact for changed IDs.",
    impactAnalyzeInput,
    async (input) => {
      return textResult(await analyzeImpact(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_requirement_create",
    "Create a requirement document with the next typed requirement ID.",
    requirementCreateInput,
    async (input) => {
      return textResult(await createRequirement(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_decision_create",
    "Create an Engineering Decision Record.",
    decisionCreateInput,
    async (input) => {
      return textResult(await createDecision(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_task_create",
    "Create a project task document.",
    taskCreateInput,
    async (input) => {
      return textResult(await createTask(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_context_pack",
    "Build compact task-specific context from project documents.",
    contextPackInput,
    async (input) => {
      return textResult(await buildContextPack(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_git_status",
    "Return Git dirty status and changed files.",
    gitStatusInput,
    async (input) => {
      return textResult(await getGitStatus(input.root));
    }
  );

  registerStructuredTool(
    server,
    "engi_project_snapshot",
    "Create a local snapshot of project files before risky changes.",
    projectSnapshotInput,
    async (input) => {
      return textResult(await createProjectSnapshot(input.root));
    }
  );

  registerStructuredTool(
    server,
    "engi_git_commit",
    "Create a Git commit for current project changes.",
    gitCommitInput,
    async (input) => {
      return textResult(await createGitCommit(input.root, input.message));
    }
  );

  registerStructuredTool(
    server,
    "engi_search",
    "Search managed Markdown documents.",
    searchInput,
    async (input) => {
      return textResult(await searchProject(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_rebuild_index",
    "Rebuild the derived SQLite project index.",
    rebuildIndexInput,
    async (input) => {
      return textResult(await rebuildIndex(input.root));
    }
  );

  registerStructuredTool(
    server,
    "engi_test_report_create",
    "Create a test report linked to verified requirements.",
    testReportCreateInput,
    async (input) => {
      return textResult(await createTestReport(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_bom_item_create",
    "Create a BOM item document linked to related entities.",
    bomItemCreateInput,
    async (input) => {
      return textResult(await createBomItem(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_tree",
    "Return a bounded safe project tree.",
    fsTreeInput,
    async (input) => {
      return textResult(await fsTree(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_list",
    "List a project directory safely.",
    fsListInput,
    async (input) => {
      return textResult(await fsList(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_read",
    "Read an ordinary project file safely.",
    fsReadInput,
    async (input) => {
      return textResult(await fsRead(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_write",
    "Create, overwrite, or append an ordinary project file.",
    fsWriteInput,
    async (input) => {
      return textResult(await fsWrite(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_mkdir",
    "Create a project directory safely.",
    fsMkdirInput,
    async (input) => {
      return textResult(await fsMkdir(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_move",
    "Move or rename a project file or directory safely.",
    fsMoveInput,
    async (input) => {
      return textResult(await fsMove(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_copy",
    "Copy a project file or directory safely.",
    fsCopyInput,
    async (input) => {
      return textResult(await fsCopy(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_delete",
    "Move a project file or directory to project trash.",
    fsDeleteInput,
    async (input) => {
      return textResult(await fsDelete(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_exists",
    "Check whether a project path exists.",
    fsExistsInput,
    async (input) => {
      return textResult(await fsExists(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_stat",
    "Return project path metadata.",
    fsStatInput,
    async (input) => {
      return textResult(await fsStat(input));
    }
  );

  registerStructuredTool(
    server,
    "engi_fs_glob",
    "Find project files by safe glob patterns.",
    fsGlobInput,
    async (input) => {
      return textResult(await fsGlob(input));
    }
  );
}
