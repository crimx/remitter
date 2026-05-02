import { defineConfig } from "tsdown";

const shared = defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  minify: Boolean(process.env.MINIFY),
  sourcemap: false,
  target: "esnext",
  treeshake: true,
});

export default defineConfig([
  {
    ...shared,
    format: ["cjs", "esm"],
  },
  {
    ...shared,
    deps: {
      alwaysBundle: ["@wopjs/disposable", "adaptive-set"],
      onlyBundle: ["@wopjs/disposable", "adaptive-set"],
    },
    outputOptions: {
      name: "remitter",
    },
    format: ["umd"],
  },
]);
