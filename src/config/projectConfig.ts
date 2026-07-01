import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { projectConfigSchema } from "./schema.js";

export interface EngiProjectConfig {
  project: {
    id: string;
    name?: string;
    schema_version?: string;
    source_of_truth?: string;
  };
  mcp?: {
    read_only_mode?: boolean;
  };
  security?: {
    deny_patterns?: string[];
    follow_symlinks?: boolean;
  };
}

export async function readProjectConfig(root: string): Promise<EngiProjectConfig> {
  const configPath = path.join(root, "project.yaml");
  await access(configPath);

  const parsed = parse(await readFile(configPath, "utf8")) as unknown;
  return projectConfigSchema.parse(parsed);
}
