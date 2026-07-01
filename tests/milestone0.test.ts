import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

const connectedClients: Client[] = [];

afterEach(async () => {
  await Promise.all(connectedClients.splice(0).map((client) => client.close()));
});

describe("milestone 0 server skeleton", () => {
  it("keeps a test project fixture in the repository", () => {
    const fixtureRoot = path.join(process.cwd(), "tests/fixtures/rc-car-mini-project");

    expect(existsSync(path.join(fixtureRoot, "project.yaml"))).toBe(true);
    expect(existsSync(path.join(fixtureRoot, "docs_requirements_v0.md"))).toBe(true);
  });

  it("starts an MCP server and lists engi_project_status", async () => {
    const server = createServer();
    const client = new Client({ name: "engimcp-test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    connectedClients.push(client);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const tools = await client.listTools();

    expect(tools.tools.map((tool) => tool.name)).toContain("engi_project_status");
  });

  it("returns a mock project status through the MCP tool", async () => {
    const server = createServer();
    const client = new Client({ name: "engimcp-test-client", version: "0.1.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    connectedClients.push(client);

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({
      name: "engi_project_status",
      arguments: {
        root: process.cwd(),
        include_validation_summary: true,
        include_git_status: true
      }
    });

    expect(result.content[0]?.type).toBe("text");

    const content = result.content[0];
    if (content?.type !== "text") {
      throw new Error("Expected text content from engi_project_status.");
    }

    expect(JSON.parse(content.text)).toMatchObject({
      documents: 0,
      requirements: 0,
      decisions: 0,
      tasks_open: 0,
      validation: {
        errors: 0,
        warnings: 0
      },
      git: {
        summary: "mock"
      }
    });
  });
});
