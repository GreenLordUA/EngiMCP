import { z } from "zod";

export const projectConfigSchema = z.object({
  project: z.object({
    id: z.string(),
    name: z.string().optional(),
    source_of_truth: z.string().optional()
  })
});
