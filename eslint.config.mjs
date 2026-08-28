import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    // Agent worktrees hold whole copies of this repo; linting them reports
    // thousands of problems from a checkout that is not the one being edited.
    ".claude/**",
    ".remember/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
    "scenes.js",
  ]),
]);
