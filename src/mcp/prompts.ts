import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer): void {
  server.prompt("start_engineering_session", "Prepare an agent for an EngiMCP session.", () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Read project status, validation summary, active context, and open tasks before making changes."
        }
      }
    ]
  }));

  server.prompt(
    "change_impact_review",
    "Review the impact of an engineering change.",
    {
      change_description: z.string()
    },
    ({ change_description }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Analyze this change: ${change_description}. Run impact analysis, build a context pack, explain affected documents, and propose a minimal edit plan.`
          }
        }
      ]
    })
  );

  server.prompt("create_engineering_decision", "Create an EDR draft.", () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Create an Engineering Decision Record with context, problem, options, decision, consequences, affected requirements, affected documents, and open questions."
        }
      }
    ]
  }));
}
