import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import initSqlJs from "sql.js";
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "../src/server.js";
import { locateSqlJsFile, rebuildIndex } from "../src/storage/sqlite.js";
import { validateProject } from "../src/validation/validator.js";

const clients: Client[] = [];
const rcCarRoot = `${process.cwd()}/examples/rc_car_project_stub`;
const fixturesRoot = `${process.cwd()}/tests/fixtures`;

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

describe("index resources prompts completion", () => {
  it("rebuilds a derived SQLite index", async () => {
    const result = await rebuildIndex(rcCarRoot);
    const indexPath = path.join(rcCarRoot, result.path);
    const SQL = await initSqlJs({
      locateFile: locateSqlJsFile
    });
    const db = new SQL.Database(readFileSync(indexPath));
    const count = db.exec("select count(*) as count from documents")[0]?.values[0]?.[0];

    expect(existsSync(indexPath)).toBe(true);
    expect(result.documents).toBe(9);
    expect(count).toBe(9);
    db.close();
  });

  it("lists MCP resources and prompts", async () => {
    const server = createServer();
    const client = new Client({ name: "resources-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    clients.push(client);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const resources = await client.listResources();
    const prompts = await client.listPrompts();
    const tools = await client.listTools();

    expect(resources.resources.map((resource) => resource.uri)).toEqual(
      expect.arrayContaining([
        "engi://project/status",
        "engi://project/map",
        "engi://validation/summary"
      ])
    );
    expect(prompts.prompts.map((prompt) => prompt.name)).toEqual(
      expect.arrayContaining([
        "start_engineering_session",
        "change_impact_review",
        "create_engineering_decision"
      ])
    );
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        "engi_doc_add_relationship",
        "engi_rebuild_index",
        "engi_test_report_create",
        "engi_bom_item_create",
        "engi_project_snapshot",
        "engi_git_commit",
        "engi_fs_tree",
        "engi_fs_list",
        "engi_fs_read",
        "engi_fs_write",
        "engi_fs_mkdir",
        "engi_fs_move",
        "engi_fs_copy",
        "engi_fs_delete",
        "engi_fs_exists",
        "engi_fs_stat",
        "engi_fs_glob"
      ])
    );
    expect(tools.tools.every((tool) => tool.outputSchema !== undefined)).toBe(true);
  });

  it("reports requirement verification warnings", async () => {
    const result = await validateProject({ root: `${fixturesRoot}/rc-car-mini-project` });

    expect(result.warnings.map((warning) => warning.code)).toContain("REQUIREMENT_WITHOUT_TESTS");
  });
});
