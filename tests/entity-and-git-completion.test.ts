import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBomItem } from "../src/bom/bomService.js";
import { addDocumentRelationship } from "../src/documents/documentService.js";
import { parseFrontmatter } from "../src/documents/frontmatter.js";
import { buildGraph, queryGraph } from "../src/graph/graphBuilder.js";
import { createGitCommit, createProjectSnapshot } from "../src/git/gitAdapter.js";
import { validateProject } from "../src/validation/validator.js";
import { createTestReport } from "../src/verification/testReportService.js";

const execFileAsync = promisify(execFile);
let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-entity-completion-"));
  await writeFile(
    path.join(tempRoot, "project.yaml"),
    "project:\n  id: entity-completion\n  name: Entity Completion\n  schema_version: 1.0.0\n",
    "utf8"
  );
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("entity and git completion", () => {
  it("adds a document relationship without dropping existing links", async () => {
    await writeManagedDocument(
      "docs/design.md",
      "DOC-DESIGN",
      "design_doc",
      "draft",
      "depends_on:\n  - FR-001",
      "# Design\n"
    );
    await writeManagedDocument("docs/fr-001.md", "FR-001", "requirement", "draft", "", "# FR\n");
    await writeManagedDocument("docs/fr-002.md", "FR-002", "requirement", "draft", "", "# FR\n");

    const result = await addDocumentRelationship({
      root: tempRoot,
      id: "DOC-DESIGN",
      relation_type: "depends_on",
      target_id: "FR-002"
    });
    const parsed = parseFrontmatter(await readFile(path.join(tempRoot, "docs/design.md"), "utf8"));

    expect(result.changed).toBe(true);
    expect(result.audit_id).toBeTruthy();
    expect(parsed.data?.depends_on).toEqual(["FR-001", "FR-002"]);
  });

  it("uses test reports as requirement verification evidence", async () => {
    await writeManagedDocument(
      "docs/fr-001.md",
      "FR-001",
      "requirement",
      "accepted",
      "",
      "# Runtime\n"
    );

    const before = await validateProject({ root: tempRoot });
    await createTestReport({
      root: tempRoot,
      id: "TEST-REPORT-001",
      title: "Runtime bench test",
      verifies: ["FR-001"],
      result: "pass"
    });
    const after = await validateProject({ root: tempRoot });
    const graph = await queryGraph({ root: tempRoot, id: "FR-001", direction: "incoming" });

    expect(before.warnings.map((warning) => warning.code)).toContain("REQUIREMENT_WITHOUT_TESTS");
    expect(after.warnings.map((warning) => warning.code)).not.toContain(
      "REQUIREMENT_WITHOUT_TESTS"
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_id: "TEST-REPORT-001",
          relation_type: "verifies",
          target_id: "FR-001"
        })
      ])
    );
  });

  it("creates BOM items that participate in graph traversal", async () => {
    await writeManagedDocument("docs/fr-001.md", "FR-001", "requirement", "draft", "", "# FR\n");

    const result = await createBomItem({
      root: tempRoot,
      id: "BOM-0001",
      part_name: "Motor controller",
      quantity: 4,
      related: ["FR-001"]
    });
    const graph = await queryGraph({ root: tempRoot, id: "FR-001", direction: "incoming" });

    expect(result.audit_id).toBeTruthy();
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_id: "BOM-0001",
          relation_type: "relates_to",
          target_id: "FR-001"
        })
      ])
    );
  });

  it("builds graph edges from inline Markdown and wiki links", async () => {
    await writeManagedDocument("docs/fr-001.md", "FR-001", "requirement", "draft", "", "# FR\n");
    await writeManagedDocument(
      "docs/design.md",
      "DOC-DESIGN",
      "design_doc",
      "draft",
      "",
      "# Design\n\nSee [[FR-001]] and [the requirement](FR-001).\n"
    );

    const graph = await buildGraph(tempRoot);

    expect(graph.edges).toEqual([
      expect.objectContaining({
        source_id: "DOC-DESIGN",
        relation_type: "relates_to",
        target_id: "FR-001"
      })
    ]);
  });

  it("creates project snapshots and explicit git commits", async () => {
    await execFileAsync("git", ["init"], { cwd: tempRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: tempRoot });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempRoot });
    await writeManagedDocument("docs/fr-001.md", "FR-001", "requirement", "draft", "", "# FR\n");

    const snapshot = await createProjectSnapshot(tempRoot);
    const commit = await createGitCommit(tempRoot, "test: commit project state");

    expect(snapshot.ok).toBe(true);
    expect(snapshot.copied_paths).toContain("docs");
    expect(existsSync(path.join(tempRoot, snapshot.path, "docs/fr-001.md"))).toBe(true);
    expect(commit.ok).toBe(true);
    expect(commit.files.map((file) => file.path)).toEqual(
      expect.arrayContaining(["docs/fr-001.md", "project.yaml"])
    );
  });
});

async function writeManagedDocument(
  relativePath: string,
  id: string,
  kind: string,
  status: string,
  extraFrontmatter: string,
  body: string
): Promise<void> {
  const frontmatter = [
    "---",
    `id: ${id}`,
    `kind: ${kind}`,
    `status: ${status}`,
    "version: 0.1.0",
    extraFrontmatter.trim(),
    "---",
    "",
    body
  ]
    .filter((part) => part.length > 0)
    .join("\n");

  const absolutePath = path.join(tempRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, frontmatter, "utf8");
}
