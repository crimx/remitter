/* eslint-env node */

import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig(() => {
  return {
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/remitter.ts"),
        formats: ["es", "cjs"],
      },
      outDir: "dist",
      sourcemap: true,
      minify: false,
    },
    esbuild: {
      mangleProps: /[^_]_$/,
    },
    test: {
      coverage: {
        reporter: ["lcov", "text"],
      },
    },
  };
});
