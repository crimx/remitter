import { rm } from "fs/promises";
import { rollup } from "rollup";
import { defineConfig } from "tsup";

import mangleCache from "./mangle-cache.json";
import pkg from "./package.json";

const base = defineConfig({
  entry: ["src/index.ts"],
  target: "esnext",
  clean: true,
  treeshake: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  minify: Boolean(process.env.MINIFY),
  esbuildOptions: options => {
    options.sourcesContent = false;
    options.mangleProps = /[^_]_$/;
    options.mangleCache = mangleCache;
  },
});

export default defineConfig([
  {
    ...base,
    format: ["cjs", "esm"],
  },
  {
    ...base,
    format: ["esm"],
    sourcemap: false,
    noExternal: Object.keys(pkg.peerDependencies),
    outExtension: () => ({ js: `.umd.mjs` }),
    onSuccess: async () => {
      const bundle = await rollup({
        input: ["dist/index.umd.mjs"],
      });

      await bundle.write({
        format: "umd",
        file: "dist/index.umd.js",
        name: "Remitter",
      });

      await rm("dist/index.umd.mjs");
    },
  },
]);
