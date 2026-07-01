import { z } from "zod";

export const projectConfigSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string().optional(),
    schema_version: z.string().default("1.0.0"),
    source_of_truth: z.string().optional()
  }),
  mcp: z
    .object({
      read_only_mode: z.boolean().default(false)
    })
    .optional(),
  security: z
    .object({
      deny_patterns: z.array(z.string()).optional(),
      follow_symlinks: z.boolean().default(false)
    })
    .optional()
});
