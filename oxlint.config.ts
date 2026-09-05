import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  ignorePatterns: [
    ...core.ignorePatterns,
    "**/.next/**",
    "**/dist/**",
    "**/out/**",
    "**/node_modules/**",
    "**/src/module_bindings/**",
  ],
  overrides: [
    {
      files: ["packages/spacetimedb/src/index.ts"],
      rules: {
        // New columns must be APPENDED at the end of a table for SpacetimeDB
        // migrations to be additive, which conflicts with alphabetical keys.
        "sort-keys": "off",
        // Index `.filter()` returns an iterator, so spreading into an array
        // before using `.length`/indexing/`.map()` is required, not useless.
        "unicorn/no-useless-spread": "off",
        // SpacetimeDB PK/index accessors use `.find()` for row lookup —
        // not Array.prototype.find, so the unicorn rule is a false positive.
        "unicorn/prefer-array-some": "off",
      },
    },
    {
      files: [
        "packages/web/lib/spacetimedb-server.ts",
        "packages/web/src/server/db.ts",
        "packages/web/src/server/worker.ts",
        "packages/web/src/server/seed-agents.ts",
      ],
      rules: {
        // SpacetimeDB connect/subscription builders are callback-based;
        // wrapping them in a Promise executor is the intended pattern.
        "promise/avoid-new": "off",
        "promise/prefer-await-to-callbacks": "off",
      },
    },
    {
      files: ["packages/worker-cf/src/**/*.ts"],
      rules: {
        // Job claiming and chunked answer streaming are order-dependent:
        // parallelizing them would race claims and shuffle message chunks.
        "no-await-in-loop": "off",
        // Same callback-based builder pattern as the node worker.
        "promise/avoid-new": "off",
        "promise/prefer-await-to-callbacks": "off",
        "promise/prefer-await-to-then": "off",
      },
    },
  ],
});
