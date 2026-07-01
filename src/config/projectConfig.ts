import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { EngiMcpError } from "../mcp/errors.js";
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
  const config = projectConfigSchema.parse(parsed);
  if (config.project.schema_version !== "1.0.0") {
    throw new EngiMcpError(
      "UNSUPPORTED_SCHEMA_VERSION",
      `Unsupported project schema_version ${config.project.schema_version}; expected 1.0.0. Run a project migration before opening this project.`
    );
  }

  return config;
}
