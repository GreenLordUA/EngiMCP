import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts } from "./mcp/prompts.js";
import { registerResources } from "./mcp/resources.js";
import { registerTools } from "./mcp/tools.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "engimcp",
    version: "0.1.0"
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
