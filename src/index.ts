#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configureRuntimeOptions, parseRuntimeOptions } from "./runtime/options.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  configureRuntimeOptions(parseRuntimeOptions(process.argv.slice(2)));
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});
