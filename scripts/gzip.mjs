import { gzipSizeFromFileSync } from "gzip-size";
import { green, gray } from "yoctocolors";
import prettyBytes from "pretty-bytes";

console.log();
console.log(
  `${gray("gzip")} dist/main.mjs  ${green(
    prettyBytes(gzipSizeFromFileSync("dist/main.mjs"))
  )}`
);
console.log(
  `${gray("gzip")} dist/main.js  ${green(
    prettyBytes(gzipSizeFromFileSync("dist/main.js"))
  )}`
);
