import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProjectMap, getProjectStatus } from "../project/projectService.js";
import { validateProject } from "../validation/validator.js";

export function registerResources(server: McpServer): void {
  server.resource("project-status", "engi://project/status", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(
          await getProjectStatus({
            root: process.cwd(),
            include_validation_summary: true,
            include_git_status: true
          }),
          null,
          2
        )
      }
    ]
  }));

  server.resource("project-map", "engi://project/map", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await getProjectMap({ root: process.cwd() }), null, 2)
      }
    ]
  }));

  server.resource("validation-summary", "engi://validation/summary", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await validateProject({ root: process.cwd() }), null, 2)
      }
    ]
  }));
}
