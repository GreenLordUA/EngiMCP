import path from "node:path";

export interface RuntimeOptions {
  root?: string;
  readOnly: boolean;
}

let runtimeOptions: RuntimeOptions = {
  readOnly: process.env.ENGIMCP_READ_ONLY === "1" || process.env.ENGIMCP_READ_ONLY === "true"
};

export function parseRuntimeOptions(argv: readonly string[]): RuntimeOptions {
  const options: RuntimeOptions = { readOnly: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--read-only") {
      options.readOnly = true;
      continue;
    }
    if (arg === "--root") {
      const root = argv[index + 1];
      if (!root) {
        throw new Error("--root requires a path.");
      }
      options.root = path.resolve(root);
      index += 1;
      continue;
    }
    if (arg.startsWith("--root=")) {
      options.root = path.resolve(arg.slice("--root=".length));
    }
  }

  return options;
}

export function configureRuntimeOptions(options: RuntimeOptions): void {
  runtimeOptions = { ...options };
}

export function getRuntimeOptions(): RuntimeOptions {
  return runtimeOptions;
}
