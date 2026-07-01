export function isEntityId(value: string): boolean {
  return /^[A-Z][A-Z0-9-]*-\d+$/.test(value);
}

export function nextSequentialId(existingIds: Iterable<string>, prefix: string, width = 3): string {
  let max = 0;
  const pattern = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)$`);

  for (const id of existingIds) {
    const match = id.match(pattern);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "item"
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
