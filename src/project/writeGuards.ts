import { readProjectConfig } from "../config/projectConfig.js";
import { EngiMcpError } from "../mcp/errors.js";
import { getRuntimeOptions } from "../runtime/options.js";

export async function assertProjectWritable(root: string): Promise<void> {
  if (getRuntimeOptions().readOnly) {
    throw new EngiMcpError("READ_ONLY", "Project is in read-only mode.");
  }

  try {
    const config = await readProjectConfig(root);
    if (config.mcp?.read_only_mode) {
      throw new EngiMcpError("READ_ONLY", "Project is in read-only mode.");
    }
  } catch (error) {
    if (error instanceof EngiMcpError) {
      throw error;
    }
  }
}
