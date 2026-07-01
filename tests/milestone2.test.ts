import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDocument,
  patchDocumentFrontmatter,
  patchDocumentSection,
  readDocument
} from "../src/documents/documentService.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-m2-"));
  await createDocument({
    root: tempRoot,
    kind: "design_doc",
    id: "DOC-MOTOR",
    title: "Motor",
    path: "docs/motor.md",
    template: "design_doc",
    frontmatter: {
      status: "draft",
      version: "0.1.0"
    }
  });
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("milestone 2 safe writes", () => {
  it("creates a document through atomic write and writes audit log", async () => {
    const document = await readDocument(tempRoot, { id: "DOC-MOTOR", mode: "full" });
    const auditLog = await readFile(path.join(tempRoot, ".engimcp/audit.log"), "utf8");

    expect(document.path).toBe("docs/motor.md");
    expect(document.content).toContain("# Motor");
    expect(auditLog).toContain("engi_doc_create");
  });

  it("supports dry-run document creation without writing a file", async () => {
    const result = await createDocument({
      root: tempRoot,
      kind: "design_doc",
      id: "DOC-DRY",
      title: "Dry Run",
      path: "docs/dry.md",
      template: "design_doc",
      dry_run: true
    });

    expect(result.content).toContain("DOC-DRY");
    await expect(readDocument(tempRoot, { id: "DOC-DRY" })).rejects.toThrow(
      "Document id not found"
    );
  });

  it("patches frontmatter and records audit", async () => {
    const result = await patchDocumentFrontmatter({
      root: tempRoot,
      id: "DOC-MOTOR",
      patch: {
        status: "accepted",
        depends_on: ["REQ-001"]
      }
    });
    const document = await readDocument(tempRoot, { id: "DOC-MOTOR", mode: "frontmatter" });
    const auditLog = await readFile(path.join(tempRoot, ".engimcp/audit.log"), "utf8");

    expect(result.changed).toBe(true);
    expect(document.frontmatter.status).toBe("accepted");
    expect(document.links).toContain("REQ-001");
    expect(auditLog).toContain("engi_frontmatter_patch");
  });

  it("patches a section by heading path without removing other content", async () => {
    await patchDocumentSection({
      root: tempRoot,
      id: "DOC-MOTOR",
      heading_path: ["Purpose"],
      operation: "replace",
      content: "## Purpose\n\nSelect a motor driver."
    });

    const document = await readDocument(tempRoot, { id: "DOC-MOTOR", mode: "full" });

    expect(document.content).toContain("Select a motor driver.");
    expect(document.content).toContain("## Requirements");
    expect(document.content).toContain("## Risks");
  });
});
