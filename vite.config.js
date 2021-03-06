/* eslint-env node */

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/remitter.ts"),
        formats: ["es", "cjs"],
      },
      outDir: "dist",
      sourcemap: isProd,
      rollupOptions: {
        external: ["react"],
      },
      minify: isProd,
    },
    test: {
      coverage: {
        reporter: ["lcov", "text"],
      },
    },
  };
});
