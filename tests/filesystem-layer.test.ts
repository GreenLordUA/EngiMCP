import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
} from "../src/filesystem/filesystemService.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-fs-"));
  await writeProjectConfig(false);
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("project filesystem layer", () => {
  it("lists, reads, stats, checks existence, and globs allowed files", async () => {
    await mkdir(path.join(tempRoot, "docs/notes"), { recursive: true });
    await writeFile(path.join(tempRoot, "docs/notes/a.md"), "# Alpha\n", "utf8");
    await writeFile(path.join(tempRoot, ".env"), "SECRET=1\n", "utf8");

    const tree = await fsTree({ root: tempRoot, path: ".", max_depth: 3 });
    const list = await fsList({ root: tempRoot, path: "docs", recursive: true });
    const read = await fsRead({ root: tempRoot, path: "docs/notes/a.md", max_bytes: 5 });
    const exists = await fsExists({ root: tempRoot, path: "docs/notes/a.md" });
    const deniedExists = await fsExists({ root: tempRoot, path: ".env" });
    const metadata = await fsStat({ root: tempRoot, path: "docs/notes/a.md" });
    const glob = await fsGlob({ root: tempRoot, patterns: ["docs/**/*.md"] });

    expect(tree.items.map((item) => item.path)).not.toContain(".env");
    expect(list.items.map((item) => item.path)).toContain("docs/notes/a.md");
    expect(read.content).toBe("# Alp");
    expect(read.truncated).toBe(true);
    expect(exists).toMatchObject({ exists: true, type: "file", allowed: true });
    expect(deniedExists).toMatchObject({ exists: false, allowed: false });
    expect(metadata).toMatchObject({ path: "docs/notes/a.md", type: "file", denied: false });
    expect(glob.matches).toEqual(["docs/notes/a.md"]);
  });

  it("creates directories and writes files atomically with audit entries", async () => {
    const mkdirResult = await fsMkdir({ root: tempRoot, path: "docs/new" });
    const writeResult = await fsWrite({
      root: tempRoot,
      path: "docs/new/file.txt",
      content: "hello\n"
    });

    await expect(
      fsWrite({ root: tempRoot, path: "docs/new/file.txt", content: "again\n" })
    ).rejects.toThrow("already exists");

    const audit = await readFile(path.join(tempRoot, ".engimcp/audit.log"), "utf8");
    expect(mkdirResult.audit_id).toBeTruthy();
    expect(writeResult.audit_id).toBeTruthy();
    expect(audit).toContain("engi_fs_mkdir");
    expect(audit).toContain("engi_fs_write");
  });

  it("supports overwrite dry-run without changing the file", async () => {
    await fsWrite({ root: tempRoot, path: "notes.txt", content: "before\n" });
    const result = await fsWrite({
      root: tempRoot,
      path: "notes.txt",
      content: "after\n",
      mode: "overwrite",
      dry_run: true
    });

    expect(result.diff_summary).toContain("dry run");
    expect(await readFile(path.join(tempRoot, "notes.txt"), "utf8")).toBe("before\n");
  });

  it("rebuilds the derived index after filesystem writes and deletes", async () => {
    const written = await fsWrite({
      root: tempRoot,
      path: "docs/indexed.md",
      content:
        "---\nid: DOC-INDEXED\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Indexed\n"
    });
    const deleted = await fsDelete({ root: tempRoot, path: "docs/indexed.md" });

    expect(written.index?.documents).toBe(1);
    expect(deleted.index?.documents).toBe(0);
  });

  it("moves, copies, and deletes through project trash", async () => {
    await fsWrite({ root: tempRoot, path: "docs/a.txt", content: "a\n" });

    const moved = await fsMove({ root: tempRoot, source: "docs/a.txt", target: "docs/b.txt" });
    const copied = await fsCopy({ root: tempRoot, source: "docs/b.txt", target: "docs/c.txt" });
    const deleted = await fsDelete({ root: tempRoot, path: "docs/c.txt" });

    expect(moved.moved).toEqual([{ from: "docs/a.txt", to: "docs/b.txt" }]);
    expect(copied.copied).toEqual([{ from: "docs/b.txt", to: "docs/c.txt" }]);
    expect(deleted.deleted[0]?.trash_path).toMatch(
      /^\.engimcp\/trash\/\d{4}-\d{2}-\d{2}\/docs\/c\.txt$/
    );
    expect(existsSync(path.join(tempRoot, deleted.deleted[0]?.trash_path ?? ""))).toBe(true);
    expect(existsSync(path.join(tempRoot, "docs/c.txt"))).toBe(false);
  });

  it("reports duplicate IDs when copying managed documents", async () => {
    await fsWrite({
      root: tempRoot,
      path: "docs/original.md",
      content:
        "---\nid: DOC-COPY-SOURCE\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Original\n"
    });

    const result = await fsCopy({
      root: tempRoot,
      source: "docs/original.md",
      target: "docs/copy.md"
    });

    expect(result.validation?.errors.map((error) => error.code)).toContain("DUPLICATE_ID");
    expect(result.index?.documents).toBe(2);
  });

  it("updates safe path links when moving files with update_links", async () => {
    await fsWrite({
      root: tempRoot,
      path: "docs/old.md",
      content: "---\nid: DOC-OLD\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Old\n"
    });
    await fsWrite({
      root: tempRoot,
      path: "docs/ref.md",
      content:
        "---\nid: DOC-REF\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Ref\n\nSee [old](docs/old.md) and [[docs/old.md]].\n"
    });

    const result = await fsMove({
      root: tempRoot,
      source: "docs/old.md",
      target: "docs/new.md",
      update_links: true
    });
    const refContent = await readFile(path.join(tempRoot, "docs/ref.md"), "utf8");

    expect(result.links_updated).toEqual(["docs/ref.md"]);
    expect(refContent).toContain("[old](docs/new.md)");
    expect(refContent).toContain("[[docs/new.md]]");
  });

  it("returns manual link warnings when moving files without update_links", async () => {
    await fsWrite({
      root: tempRoot,
      path: "docs/old.md",
      content: "---\nid: DOC-OLD\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Old\n"
    });
    await fsWrite({
      root: tempRoot,
      path: "docs/ref.md",
      content:
        "---\nid: DOC-REF\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# Ref\n\nSee [old](docs/old.md).\n"
    });

    const result = await fsMove({
      root: tempRoot,
      source: "docs/old.md",
      target: "docs/new.md"
    });

    expect(result.links_updated).toEqual([]);
    expect(result.warnings).toContain("Manual link updates required in: docs/ref.md");
  });

  it("reports outgoing managed document links during move and delete", async () => {
    await writeManagedDocument("docs/target.md", "DOC-TARGET", "design_doc", "", "# Target\n");
    await writeManagedDocument(
      "docs/source.md",
      "DOC-SOURCE",
      "design_doc",
      "depends_on:\n  - DOC-TARGET",
      "# Source\n"
    );

    const moved = await fsMove({
      root: tempRoot,
      source: "docs/source.md",
      target: "docs/source-moved.md"
    });
    const deleted = await fsDelete({ root: tempRoot, path: "docs/source-moved.md" });

    expect(moved.warnings).toContain(
      "Managed document has outgoing links to: depends_on:DOC-TARGET"
    );
    expect(deleted.warnings).toContain(
      "Deleted managed document had outgoing links to: depends_on:DOC-TARGET"
    );
  });

  it("rejects traversal, denied paths, symlink escape, and read-only writes", async () => {
    const outside = await mkdtemp(path.join(os.tmpdir(), "engimcp-fs-outside-"));
    await writeFile(path.join(outside, "outside.txt"), "outside\n", "utf8");
    await symlink(outside, path.join(tempRoot, "outside-link"));
    await writeProjectConfig(true);

    try {
      await expect(fsRead({ root: tempRoot, path: "../../etc/passwd" })).rejects.toThrow(
        "inside project root"
      );
      await expect(fsRead({ root: tempRoot, path: ".env" })).rejects.toThrow("denied");
      await expect(fsRead({ root: tempRoot, path: "outside-link/outside.txt" })).rejects.toThrow(
        "outside project root"
      );
      await expect(fsMkdir({ root: tempRoot, path: "blocked" })).rejects.toThrow("read-only");
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });

  it("blocks deleting managed documents with incoming links unless forced", async () => {
    await writeManagedDocument("docs/req.md", "FR-001", "requirement", "", "# Requirement\n");
    await writeManagedDocument(
      "docs/design.md",
      "DOC-DESIGN",
      "design_doc",
      "depends_on:\n  - FR-001",
      "# Design\n"
    );

    await expect(fsDelete({ root: tempRoot, path: "docs/req.md" })).rejects.toThrow(
      "incoming links"
    );

    const result = await fsDelete({ root: tempRoot, path: "docs/req.md", force: true });
    expect(result.broken_links_created).toEqual(["docs/design.md"]);
  });
});

async function writeProjectConfig(readOnly: boolean): Promise<void> {
  await writeFile(
    path.join(tempRoot, "project.yaml"),
    `project:\n  id: fs\n  name: Filesystem\n  schema_version: 1.0.0\nmcp:\n  read_only_mode: ${readOnly}\n`,
    "utf8"
  );
}

async function writeManagedDocument(
  relativePath: string,
  id: string,
  kind: string,
  extraFrontmatter: string,
  body: string
): Promise<void> {
  const absolutePath = path.join(tempRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    [
      "---",
      `id: ${id}`,
      `kind: ${kind}`,
      "status: draft",
      "version: 0.1.0",
      extraFrontmatter.trim(),
      "---",
      "",
      body
    ]
      .filter((part) => part.length > 0)
      .join("\n"),
    "utf8"
  );
}
