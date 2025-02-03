import { rm } from "fs/promises";
import { rollup } from "rollup";
import { defineConfig } from "tsup";

import mangleCache from "./mangle-cache.json";
import pkg from "./package.json";

const base = defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  esbuildOptions: options => {
    options.sourcesContent = false;
    options.mangleProps = /[^_]_$/;
    options.mangleCache = mangleCache;
  },
  minify: Boolean(process.env.MINIFY),
  sourcemap: true,
  splitting: false,
  target: "esnext",
  treeshake: true,
});

export default defineConfig([
  {
    ...base,
    format: ["cjs", "esm"],
  },
  {
    ...base,
    format: ["esm"],
    noExternal: Object.keys(pkg.dependencies),
    onSuccess: async () => {
      const bundle = await rollup({
        input: ["dist/index.umd.mjs"],
      });

      await bundle.write({
        file: "dist/index.umd.js",
        format: "umd",
        name: "Remitter",
      });

      await rm("dist/index.umd.mjs");
    },
    outExtension: () => ({ js: `.umd.mjs` }),
    sourcemap: false,
  },
]);
