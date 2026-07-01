import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDocument,
  discoverMarkdownDocuments,
  patchDocumentSection
} from "../src/documents/documentService.js";
import { fsWrite } from "../src/filesystem/filesystemService.js";
import { resolveSafePath } from "../src/project/pathSafety.js";
import { createRequirement } from "../src/requirements/requirementService.js";
import { configureRuntimeOptions, parseRuntimeOptions } from "../src/runtime/options.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-security-"));
  await writeFile(
    path.join(tempRoot, "project.yaml"),
    "project:\n  id: security\n  name: Security\n  schema_version: 1.0.0\nmcp:\n  read_only_mode: false\n",
    "utf8"
  );
});

afterEach(async () => {
  configureRuntimeOptions({ readOnly: false });
  await rm(tempRoot, { recursive: true, force: true });
});

describe("security completion", () => {
  it("blocks write tools in read-only mode", async () => {
    await writeFile(
      path.join(tempRoot, "project.yaml"),
      "project:\n  id: security\n  name: Security\n  schema_version: 1.0.0\nmcp:\n  read_only_mode: true\n",
      "utf8"
    );

    await expect(
      createRequirement({
        root: tempRoot,
        requirement_type: "functional",
        title: "Blocked",
        statement: "This must not be written.",
        priority: "must"
      })
    ).rejects.toThrow("read-only");
  });

  it("blocks write tools when the server is started with --read-only", async () => {
    configureRuntimeOptions(parseRuntimeOptions(["--root", tempRoot, "--read-only"]));

    await expect(
      createRequirement({
        root: tempRoot,
        requirement_type: "functional",
        title: "Runtime blocked",
        statement: "This must not be written.",
        priority: "must"
      })
    ).rejects.toThrow("read-only");
  });

  it("rejects tool roots outside the configured runtime root", async () => {
    const otherRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-other-root-"));
    await writeFile(
      path.join(otherRoot, "project.yaml"),
      "project:\n  id: other\n  name: Other\n  schema_version: 1.0.0\n",
      "utf8"
    );
    configureRuntimeOptions(parseRuntimeOptions(["--root", tempRoot]));

    try {
      await expect(discoverMarkdownDocuments(otherRoot)).rejects.toThrow("configured project root");
    } finally {
      await rm(otherRoot, { recursive: true, force: true });
    }
  });

  it("blocks denied write paths and skips denied discovery paths", async () => {
    await writeFile(
      path.join(tempRoot, "private_notes.md"),
      "---\nid: DOC-PRIVATE\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Private\n",
      "utf8"
    );

    const documents = await discoverMarkdownDocuments(tempRoot);
    await expect(
      createDocument({
        root: tempRoot,
        kind: "design_doc",
        id: "DOC-SECRET",
        title: "Secret",
        path: "docs/secret-plan.md",
        template: "design_doc"
      })
    ).rejects.toThrow("denied");

    expect(documents.map((document) => document.id)).not.toContain("DOC-PRIVATE");
  });

  it("refuses to overwrite files with Git conflict markers", async () => {
    await writeFile(
      path.join(tempRoot, "docs-conflict.md"),
      "---\nid: DOC-CONFLICT\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Conflict\n\n<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n",
      "utf8"
    );
    await writeFile(
      path.join(tempRoot, "ordinary.txt"),
      "<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n",
      "utf8"
    );

    await expect(
      patchDocumentSection({
        root: tempRoot,
        id: "DOC-CONFLICT",
        heading_path: ["Conflict"],
        operation: "append",
        content: "updated\n"
      })
    ).rejects.toThrow("Git conflict markers");
    await expect(
      fsWrite({
        root: tempRoot,
        path: "ordinary.txt",
        content: "updated\n",
        mode: "overwrite"
      })
    ).rejects.toThrow("Git conflict markers");
  });

  it("blocks symlink escape outside the project root", async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "engimcp-outside-"));
    const outsideFile = path.join(outside, "external.md");
    await writeFile(outsideFile, "# External\n", "utf8");
    await symlink(outsideFile, path.join(tempRoot, "external.md"));

    try {
      await expect(resolveSafePath(tempRoot, "external.md")).rejects.toThrow(
        "outside project root"
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
