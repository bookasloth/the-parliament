// Parse a comma-separated list of Prisma migration names from an env var into a
// clean, validated array. Names flow into a shell command (execSync), so we hard-
// reject anything that isn't a real migration folder name — `<14 digits>_<snake>` —
// which also blocks shell-injection. Invalid entries are dropped (caller logs them).
const MIGRATION_NAME = /^\d{14}_[a-z0-9_]+$/;

export function parseMigrationList(raw) {
  const items = String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = [];
  const invalid = [];
  for (const name of items) {
    if (MIGRATION_NAME.test(name)) valid.push(name);
    else invalid.push(name);
  }
  return { valid, invalid };
}
