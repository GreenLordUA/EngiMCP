import { z } from "zod";

export const projectConfigSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string().optional(),
    schema_version: z.string().default("1.0.0"),
    source_of_truth: z.string().optional()
  })
});
