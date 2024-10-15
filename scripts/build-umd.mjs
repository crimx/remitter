import { rollup } from "rollup";

const bundle = await rollup({
  input: ["dist/index.mjs"],
});

await bundle.write({
  format: "umd",
  file: "dist/index.umd.js",
  name: "Remitter",
});
