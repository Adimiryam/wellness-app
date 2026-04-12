import fs from "node:fs";
import path from "node:path";
const partsDir = "parts";
const files = fs.readdirSync(partsDir).filter(f => /^p[a-z]{2,3}$/.test(f)).sort();
const buffers = files.map(f => {
  const buf = fs.readFileSync(path.join(partsDir, f));
  // Ensure each part ends with a newline (fixes truncation from GitHub push)
  if (buf.length === 0 || buf[buf.length - 1] !== 10) {
    return Buffer.concat([buf, Buffer.from("\n")]);
  }
  return buf;
});
const combined = buffers.reduce((a, b) => Buffer.concat([a, b]));
fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/App.jsx", combined);
console.log("Wrote src/App.jsx (" + combined.length + " bytes from " + files.length + " parts)");
