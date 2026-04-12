import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const encodedDir = "encoded";
const chunks = fs.readdirSync(encodedDir)
  .filter(f => f.startsWith("chunk_"))
  .sort();

const b64 = chunks.map(f => fs.readFileSync(path.join(encodedDir, f), "utf8").trim()).join("");
const gzipped = Buffer.from(b64, "base64");
let source = gunzipSync(gzipped).toString("utf8");

// Patch: remove useMemo from renderFoodDiary (hooks cannot be used inside regular functions)
source = source.replace(
  "const allDayTotals = useMemo(() => {\n      return mfpFoodDiary.map(entry => {\n        const { totals } = getDayTotals(entry);\n        return { date: entry.date, ...totals };\n      }).sort((a, b) => a.date.localeCompare(b.date));\n    }, [mfpFoodDiary]);",
  "const allDayTotals = mfpFoodDiary.map(entry => {\n      const { totals } = getDayTotals(entry);\n      return { date: entry.date, ...totals };\n    }).sort((a, b) => a.date.localeCompare(b.date));"
);

fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/App.jsx", source);
console.log("Wrote src/App.jsx (" + source.length + " bytes from " + chunks.length + " encoded chunks)");
