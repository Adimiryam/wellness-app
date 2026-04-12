import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const encodedDir = "encoded";
const chunks = fs.readdirSync(encodedDir)
  .filter(f => f.startsWith("chunk_"))
  .sort();

const b64 = chunks.map(f => fs.readFileSync(path.join(encodedDir, f), "utf8").trim()).join("");
const gzipped = Buffer.from(b64, "base64");
const source = gunzipSync(gzipped);

fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/App.jsx", source);
console.log("Wrote src/App.jsx (" + source.length + " bytes from " + chunks.length + " encoded chunks)");
