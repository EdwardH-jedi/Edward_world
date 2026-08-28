import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Agent worktrees under .claude/ hold whole copies of this repo, and their
    // test files would otherwise be globbed in alongside the real ones — a
    // silently doubled suite reporting on a stale checkout.
    exclude: ["node_modules/**", "dist/**", ".next/**", ".claude/**"],
    coverage: {
      include: ["lib/game/**/*.ts", "data/**/*.ts"],
    },
  },
});
