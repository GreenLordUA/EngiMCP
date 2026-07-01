export function isEntityId(value: string): boolean {
  return /^[A-Z][A-Z0-9-]*-\d+$/.test(value);
}
