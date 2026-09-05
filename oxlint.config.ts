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
      files: ["packages/api/src/db.ts"],
      rules: {
        "promise/avoid-new": "off",
      },
    },
  ],
});
