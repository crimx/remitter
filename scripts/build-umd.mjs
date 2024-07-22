import { rollup } from "rollup";

const bundle = await rollup({
  input: ["dist/main.mjs"],
});

await bundle.write({
  format: "umd",
  file: "dist/main.umd.js",
  name: "remitter",
});
