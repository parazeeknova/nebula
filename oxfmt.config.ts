import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/.next/**",
    "**/dist/**",
    "**/out/**",
    "**/node_modules/**",
    "**/src/module_bindings/**",
    "**/*.md",
  ],
});
