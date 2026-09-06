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
        "sort-keys": "off",
        "unicorn/no-useless-spread": "off",
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
        "promise/avoid-new": "off",
        "promise/prefer-await-to-callbacks": "off",
      },
    },
    {
      files: ["packages/worker-cf/src/**/*.ts"],
      // oxlint-disable-next-line sort-keys
      rules: {
        "no-await-in-loop": "off",
        "promise/avoid-new": "off",
        "promise/prefer-await-to-callbacks": "off",
        "promise/prefer-await-to-then": "off",
        "max-classes-per-file": "off",
      },
    },
  ],
});
