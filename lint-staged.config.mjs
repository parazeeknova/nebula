// Runs `check` (oxfmt write + oxlint fix) scoped to staged files.
// Generated SpacetimeDB bindings and build output are skipped:
// they are excluded from lint via ignorePatterns and must not be touched.
const skipGenerated = (files) =>
  files.filter(
    (file) => !file.includes("module_bindings") && !file.includes("/.next/")
  );

const withTargets = (command) => (files) => {
  const targets = skipGenerated(files);
  return targets.length === 0 ? [] : `${command} ${targets.join(" ")}`;
};

export default {
  "*.{ts,tsx,js,jsx,mjs,cjs,json,jsonc}": [
    withTargets("oxfmt"),
    withTargets("oxlint --fix"),
  ],
};
