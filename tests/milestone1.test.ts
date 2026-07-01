import { describe, expect, it } from "vitest";
import { readDocument } from "../src/documents/documentService.js";
import { getProjectMap, getProjectStatus } from "../src/project/projectService.js";
import { validateProject } from "../src/validation/validator.js";

const fixturesRoot = `${process.cwd()}/tests/fixtures`;
const rcCarRoot = `${fixturesRoot}/rc-car-mini-project`;

describe("milestone 1 markdown project core", () => {
  it("indexes the test project and reports real status counts", async () => {
    const status = await getProjectStatus({
      root: rcCarRoot,
      include_validation_summary: true,
      include_git_status: false
    });

    expect(status).toMatchObject({
      project_id: "rc-car-mini",
      documents: 1,
      requirements: 1,
      decisions: 0,
      tasks_open: 0,
      validation: {
        errors: 0,
        warnings: 1
      }
    });
  });

  it("returns a project map from managed Markdown documents", async () => {
    const map = await getProjectMap({ root: rcCarRoot });

    expect(map.items).toEqual([
      {
        id: "REQ-RC-CAR-MINI-V0",
        path: "docs_requirements_v0.md",
        kind: "requirements",
        status: "draft"
      }
    ]);
  });

  it("reads a document by ID with frontmatter, headings, content, and links", async () => {
    const document = await readDocument(rcCarRoot, {
      id: "REQ-RC-CAR-MINI-V0",
      mode: "full"
    });

    expect(document.id).toBe("REQ-RC-CAR-MINI-V0");
    expect(document.path).toBe("docs_requirements_v0.md");
    expect(document.headings).toContain("# Radio-Controlled Car Mini Specification v0");
    expect(document.links).toContain("DOC-RC-CAR-MINI-DRIVE");
    expect(document.content).toContain("Runtime: at least 30 minutes");
  });

  it("detects duplicate document IDs", async () => {
    const result = await validateProject({ root: `${fixturesRoot}/duplicate-id-project` });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("DUPLICATE_ID");
  });

  it("detects broken frontmatter", async () => {
    const result = await validateProject({ root: `${fixturesRoot}/broken-frontmatter-project` });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("BROKEN_FRONTMATTER");
  });
});
