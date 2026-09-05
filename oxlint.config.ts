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
        // Index `.filter()` returns an iterator, so spreading into an array
        // before using `.length`/indexing/`.map()` is required, not useless.
        "unicorn/no-useless-spread": "off",
        // SpacetimeDB PK/index accessors use `.find()` for row lookup —
        // not Array.prototype.find, so the unicorn rule is a false positive.
        "unicorn/prefer-array-some": "off",
      },
    },
    {
      files: ["packages/web/lib/spacetimedb-server.ts"],
      rules: {
        "promise/avoid-new": "off",
      },
    },
  ],
});
