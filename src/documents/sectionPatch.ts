import { EngiMcpError } from "../mcp/errors.js";

export type SectionPatchOperation = "replace" | "append" | "prepend" | "insert_after";

export interface SectionPatchInput {
  headingPath: string[];
  operation: SectionPatchOperation;
  content: string;
}

interface SectionRange {
  start: number;
  end: number;
  level: number;
}

export function patchSection(markdown: string, input: SectionPatchInput): string {
  const lines = markdown.split(/\r?\n/);
  const range = findSectionRange(lines, input.headingPath);
  const existing = lines.slice(range.start, range.end).join("\n");
  const nextSection = applyOperation(existing, input);

  return [
    ...lines.slice(0, range.start),
    ...nextSection.split(/\r?\n/),
    ...lines.slice(range.end)
  ].join("\n");
}

function applyOperation(existing: string, input: SectionPatchInput): string {
  if (input.operation === "replace") {
    return input.content.trimEnd();
  }

  if (input.operation === "append") {
    return `${existing.trimEnd()}\n\n${input.content.trimEnd()}`;
  }

  if (input.operation === "prepend") {
    const [heading, ...body] = existing.split(/\r?\n/);
    return `${heading}\n\n${input.content.trimEnd()}\n${body.join("\n").trimStart()}`;
  }

  return `${existing.trimEnd()}\n\n${input.content.trimEnd()}`;
}

function findSectionRange(lines: string[], headingPath: string[]): SectionRange {
  if (headingPath.length === 0) {
    throw new EngiMcpError("INVALID_HEADING_PATH", "Heading path must not be empty.");
  }

  let searchFrom = 0;
  let current: SectionRange | undefined;

  for (const heading of headingPath) {
    current = findNextHeading(lines, heading, searchFrom, current?.level);
    searchFrom = current.start + 1;
  }

  if (!current) {
    throw new EngiMcpError("SECTION_NOT_FOUND", "Section not found.");
  }

  return {
    ...current,
    end: findSectionEnd(lines, current.start, current.level)
  };
}

function findNextHeading(
  lines: string[],
  text: string,
  start: number,
  parentLevel?: number
): SectionRange {
  for (let index = start; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    if (parentLevel !== undefined && level <= parentLevel) {
      break;
    }

    if (match[2].trim() === text) {
      return {
        start: index,
        end: lines.length,
        level
      };
    }
  }

  throw new EngiMcpError("SECTION_NOT_FOUND", `Section not found: ${text}`);
}

function findSectionEnd(lines: string[], start: number, level: number): number {
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index]?.match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      return index;
    }
  }

  return lines.length;
}
