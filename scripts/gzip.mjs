import { gzipSizeFromFileSync } from "gzip-size";
import { green, gray } from "yoctocolors";
import prettyBytes from "pretty-bytes";

console.log();
console.log(
  `${gray("gzip")} dist/remitter.mjs  ${green(
    prettyBytes(gzipSizeFromFileSync("dist/remitter.mjs"))
  )}`
);
console.log(
  `${gray("gzip")} dist/remitter.js  ${green(
    prettyBytes(gzipSizeFromFileSync("dist/remitter.js"))
  )}`
);
