import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  await mkdir(directory, { recursive: true });
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, filePath);
}
