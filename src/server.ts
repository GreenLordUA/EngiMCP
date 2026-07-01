import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts } from "./mcp/prompts.js";
import { registerResources } from "./mcp/resources.js";
import { registerTools } from "./mcp/tools.js";
import { ENGI_MCP_VERSION } from "./version.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "engimcp",
    version: ENGI_MCP_VERSION
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
