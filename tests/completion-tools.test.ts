import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readDocument } from "../src/documents/documentService.js";
import { initProject } from "../src/project/projectInit.js";
import { getProjectStatus } from "../src/project/projectService.js";
import { rebuildFullTextIndex } from "../src/search/ftsIndex.js";
import { searchProject } from "../src/search/searchService.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-completion-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("completion tools", () => {
  it("initializes a project structure", async () => {
    const result = await initProject({ root: tempRoot });
    const status = await getProjectStatus({
      root: tempRoot,
      include_git_status: false,
      include_validation_summary: true
    });

    expect(result.ok).toBe(true);
    expect(result.created_paths).toContain("project.yaml");
    expect(status.project_id).toBe(path.basename(tempRoot));
    expect(status.documents).toBe(1);
  });

  it("reads by kind and reads a section by heading path", async () => {
    await initProject({ root: tempRoot });

    const byKind = await readDocument(tempRoot, { kind: "overview", mode: "headings" });
    const section = await readDocument(tempRoot, {
      id: "DOC-PROJECT-README",
      mode: "section",
      heading_path: ["Project Overview"]
    });

    expect(byKind.path).toBe("docs/README.md");
    expect(section.content).toContain("# Project Overview");
  });

  it("searches Markdown documents by text and metadata filters", async () => {
    await initProject({ root: tempRoot });
    await writeFile(
      path.join(tempRoot, "docs/tagged.md"),
      "---\nid: DOC-TAGGED\nkind: design_doc\nstatus: accepted\nversion: 0.1.0\ntags:\n  - drivetrain\nowner: electrical\n---\n\n# Tagged\n\nMotor overview for tagged search.\n",
      "utf8"
    );

    const index = await rebuildFullTextIndex(tempRoot);
    const results = await searchProject({
      root: tempRoot,
      query: "overview",
      filters: {
        kind: ["overview"]
      }
    });
    const tagged = await searchProject({
      root: tempRoot,
      query: "motor",
      filters: {
        tags: ["drivetrain"],
        frontmatter: {
          owner: "electrical"
        }
      }
    });

    expect(index.documents).toHaveLength(2);
    expect(results.results[0]).toMatchObject({
      id: "DOC-PROJECT-README",
      path: "docs/README.md"
    });
    expect(tagged.results[0]).toMatchObject({
      id: "DOC-TAGGED",
      path: "docs/tagged.md"
    });
  });
});
