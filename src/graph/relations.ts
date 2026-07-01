export const relationTypes = [
  "depends_on",
  "impacts",
  "satisfies",
  "verified_by",
  "verifies",
  "decided_by",
  "updates",
  "supersedes",
  "relates_to",
  "blocks",
  "derives_from"
] as const;

export type RelationType = (typeof relationTypes)[number];

export function isRelationType(value: string): value is RelationType {
  return (relationTypes as readonly string[]).includes(value);
}

export function extractRelations(frontmatter: Record<string, unknown>): Array<{
  relation_type: RelationType;
  target_id: string;
}> {
  return relationTypes.flatMap((relationType) => {
    const value = frontmatter[relationType];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((target_id) => ({ relation_type: relationType, target_id }));
    }
    return typeof value === "string" ? [{ relation_type: relationType, target_id: value }] : [];
  });
}
