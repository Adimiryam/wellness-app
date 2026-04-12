import fs from "node:fs";
import path from "node:path";
const partsDir = "parts";
const files = fs.readdirSync(partsDir).filter(f => /^p[a-z]{2,3}$/.test(f)).sort();
const combined = files.map(f => fs.readFileSync(path.join(partsDir, f))).reduce((a, b) => Buffer.concat([a, b]));
fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/App.jsx", combined);
console.log("Wrote src/App.jsx (" + combined.length + " bytes from " + files.length + " parts)");
