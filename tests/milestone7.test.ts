import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import { getProjectStatus } from "../src/project/projectService.js";
import { readProjectConfig } from "../src/config/projectConfig.js";
import { ENGI_MCP_VERSION } from "../src/version.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "engimcp-m7-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("milestone 7 v1 stabilization", () => {
  it("uses v1 package and server versions", () => {
    expect(packageJson.version).toBe("1.0.0");
    expect(ENGI_MCP_VERSION).toBe("1.0.0");
  });

  it("defaults missing project schema version to 1.0.0", async () => {
    await writeFile(
      path.join(tempRoot, "project.yaml"),
      "project:\n  id: schema-default\n  name: Schema Default\n",
      "utf8"
    );

    const config = await readProjectConfig(tempRoot);

    expect(config.project.schema_version).toBe("1.0.0");
  });

  it("returns a clear error for unsupported project schema versions", async () => {
    await writeFile(
      path.join(tempRoot, "project.yaml"),
      "project:\n  id: old-schema\n  name: Old Schema\n  schema_version: 0.9.0\n",
      "utf8"
    );

    await expect(readProjectConfig(tempRoot)).rejects.toThrow("Unsupported project schema_version");
  });

  it("indexes 1000 markdown files within the MVP benchmark target", async () => {
    await writeFile(
      path.join(tempRoot, "project.yaml"),
      "project:\n  id: benchmark\n  name: Benchmark\n  schema_version: 1.0.0\n",
      "utf8"
    );

    await Promise.all(
      Array.from({ length: 1000 }, (_, index) => {
        const id = `DOC-BENCH-${String(index + 1).padStart(4, "0")}`;
        return writeFile(
          path.join(tempRoot, `${id}.md`),
          `---\nid: ${id}\nkind: design_doc\nstatus: draft\nversion: 0.1.0\n---\n\n# ${id}\n`,
          "utf8"
        );
      })
    );

    const start = performance.now();
    const status = await getProjectStatus({
      root: tempRoot,
      include_git_status: false,
      include_validation_summary: false
    });
    const elapsedMs = performance.now() - start;

    expect(status.documents).toBe(1000);
    expect(elapsedMs).toBeLessThan(10_000);
  });
});
