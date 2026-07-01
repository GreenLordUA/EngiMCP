import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getProjectStatus } from "../project/projectService.js";

const projectStatusInput = {
  root: z.string().min(1).describe("Absolute path to the project root."),
  include_validation_summary: z.boolean().default(true),
  include_git_status: z.boolean().default(true)
};

export function registerTools(server: McpServer): void {
  server.tool(
    "engi_project_status",
    "Return a concise EngiMCP project status.",
    projectStatusInput,
    async (input) => {
      const status = await getProjectStatus(input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2)
          }
        ]
      };
    }
  );
}
