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

// Patch 1: remove useMemo from renderFoodDiary (hooks cannot be used inside regular functions)
source = source.replace(
  "const allDayTotals = useMemo(() => {\n      return mfpFoodDiary.map(entry => {\n        const { totals } = getDayTotals(entry);\n        return { date: entry.date, ...totals };\n      }).sort((a, b) => a.date.localeCompare(b.date));\n    }, [mfpFoodDiary]);",
  "const allDayTotals = mfpFoodDiary.map(entry => {\n      const { totals } = getDayTotals(entry);\n      return { date: entry.date, ...totals };\n    }).sort((a, b) => a.date.localeCompare(b.date));"
);

// Patch 2: Add "2weeks" period option to the trend period selector and days map
source = source.replace(
  'const trendPeriodDays = { week: 7, month: 30, "3months": 90, all: 9999 };',
  'const trendPeriodDays = { week: 7, "2weeks": 14, month: 30, "3months": 90, all: 9999 };'
);

source = source.replace(
  '[{ id: "week", label: "\u05E9\u05D1\u05D5\u05E2" }, { id: "month", label: "\u05D7\u05D5\u05D3\u05E9" }, { id: "3months", label: "3 \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD" }, { id: "all", label: "\u05D4\u05DB\u05DC" }]',
  '[{ id: "week", label: "\u05E9\u05D1\u05D5\u05E2" }, { id: "2weeks", label: "\u05E9\u05D1\u05D5\u05E2\u05D9\u05D9\u05DD" }, { id: "month", label: "\u05D7\u05D5\u05D3\u05E9" }, { id: "3months", label: "3 \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD" }, { id: "all", label: "\u05D4\u05DB\u05DC" }]'
);

// Patch 3: Add "Most Used Products" section after protein trend chart in trends view
const MOST_USED_SECTION = `
            {/* Most Used Products */}
            {(() => {
              const todayStr = new Date().toISOString().split("T")[0];
              const periodEntries = mfpFoodDiary.filter(e => e.date >= trendCutoffStr && e.date < todayStr);
              const foodCounts = {};
              periodEntries.forEach(entry => {
                ["B", "L", "D", "S"].forEach(meal => {
                  if (entry[meal] && Array.isArray(entry[meal])) {
                    entry[meal].forEach(f => {
                      const name = f.split("|")[0].trim();
                      const cals = parseInt(f.split("|")[1]) || 0;
                      if (name) {
                        if (!foodCounts[name]) foodCounts[name] = { count: 0, totalCal: 0 };
                        foodCounts[name].count++;
                        foodCounts[name].totalCal += cals;
                      }
                    });
                  }
                });
              });
              const sorted = Object.entries(foodCounts)
                .map(([name, data]) => ({ name, count: data.count, avgCal: Math.round(data.totalCal / data.count) }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20);
              if (sorted.length === 0) return null;
              const maxCount = sorted[0].count;
              return (
                <div style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12, textAlign: "right" }}>{"\u2B50"} \u05DE\u05D5\u05E6\u05E8\u05D9\u05DD \u05D4\u05DB\u05D9 \u05E0\u05E4\u05D5\u05E6\u05D9\u05DD</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {sorted.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: (item.count / maxCount * 100) + "%", background: "linear-gradient(90deg, rgba(99,102,241,0.08), rgba(99,102,241,0.15))", borderRadius: 8, zIndex: 0 }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 10px", position: "relative", zIndex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", minWidth: 20, textAlign: "center" }}>{item.count}x</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.avgCal} \u05E7\u05DC\u05F3</span>
                          </div>
                          <span style={{ fontSize: 12, color: "#1e293b", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{item.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}`;

source = source.replace(
  '{proteinGoal > 0 && <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6 }}>\u05D9\u05E2\u05D3: {proteinGoal}g | \u05D9\u05E8\u05D5\u05E7 = \u05E2\u05DE\u05D9\u05D3\u05D4 \u05D1\u05D9\u05E2\u05D3</div>}\n            </div>\n          </>',
  '{proteinGoal > 0 && <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 6 }}>\u05D9\u05E2\u05D3: {proteinGoal}g | \u05D9\u05E8\u05D5\u05E7 = \u05E2\u05DE\u05D9\u05D3\u05D4 \u05D1\u05D9\u05E2\u05D3</div>}\n            </div>' + MOST_USED_SECTION + '\n          </>'
);

// Patch 4: Remove "Macro Average Pie" section from trends view
source = source.replace(
  '\n            {/* Macro Average Pie */}\n            <div style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>\n              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 10, textAlign: "right" }}>\u05DE\u05DE\u05D5\u05E6\u05E2 \u05DE\u05D0\u05E7\u05E8\u05D5</div>\n              {renderMacroPie(avgCalories, avgCarbs, avgFat, avgProtein)}\n            </div>',
  ''
);

// Patch 5: Replace stats grid with small protein average indicator
source = source.replace(
  `{/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              <div style={{ background: "#fffbeb", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05D4\u05DB\u05D9 \u05D2\u05D1\u05D5\u05D4</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{maxCal}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05E7\u05DC\u05D5\u05E8\u05D9\u05D5\u05EA</div>
              </div>
              <div style={{ background: "#f0fdf4", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05D4\u05DB\u05D9 \u05E0\u05DE\u05D5\u05DA</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{minCal}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05E7\u05DC\u05D5\u05E8\u05D9\u05D5\u05EA</div>
              </div>
              <div style={{ background: "#faf5ff", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D7\u05DC\u05D1\u05D5\u05DF</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#7c3aed" }}>{avgProtein}g</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05DC\u05D9\u05D5\u05DD</div>
              </div>
              <div style={{ background: "#f0f9ff", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05D9\u05DE\u05D9\u05DD \u05E2\u05DD \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0369a1" }}>{trendData.length}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>\u05DE\u05EA\u05D5\u05DA {trendDays === 9999 ? "\u05D4\u05DB\u05DC" : trendDays}</div>
              </div>
            </div>`,
  `<div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>{avgProtein}g</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D7\u05DC\u05D1\u05D5\u05DF \u05DC\u05D9\u05D5\u05DD</span>
            </div>`
);

// Patch 6: Exclude today from trend calculations (incomplete day skews averages)
source = source.replace(
  'const trendData = allDayTotals.filter(d => d.date >= trendCutoffStr && d.calories > 0);',
  'const trendTodayStr = new Date().toISOString().split("T")[0];\n    const trendData = allDayTotals.filter(d => d.date >= trendCutoffStr && d.date < trendTodayStr && d.calories > 0);'
);

// Patch 7: Add profile editing section at top of goals tab
const PROFILE_SECTION = `
      {/* Profile Section */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16, textAlign: "right" }}>\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC - \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D1\u05E1\u05D9\u05E1</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, textAlign: "right" }}>\u05D2\u05D5\u05D1\u05D4 (\u05E1\u05F4\u05DE)</label>
            <input type="number" value={userProfile?.height || ""} onChange={e => setUserProfile(p => ({...p, height: e.target.value}))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, textAlign: "center", boxSizing: "border-box", fontWeight: 600 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, textAlign: "right" }}>\u05D2\u05D9\u05DC</label>
            <input type="number" value={userProfile?.age || ""} onChange={e => setUserProfile(p => ({...p, age: e.target.value}))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, textAlign: "center", boxSizing: "border-box", fontWeight: 600 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, textAlign: "right" }}>\u05DE\u05D9\u05DF</label>
            <select value={userProfile?.gender || "female"} onChange={e => setUserProfile(p => ({...p, gender: e.target.value}))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, textAlign: "center", boxSizing: "border-box", fontWeight: 600, background: "#fff" }}>
              <option value="female">\u05E0\u05E7\u05D1\u05D4</option>
              <option value="male">\u05D6\u05DB\u05E8</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4, textAlign: "right" }}>\u05E9\u05DD</label>
            <input type="text" value={userProfile?.name || ""} onChange={e => setUserProfile(p => ({...p, name: e.target.value}))}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 15, textAlign: "right", boxSizing: "border-box", fontWeight: 600 }} />
          </div>
        </div>
      </div>`;

source = source.replace(
  '<div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 4, textAlign: "right" }}>\uD83C\uDFAF \u05D4\u05D9\u05E2\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9</div>',
  '<div style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", marginBottom: 4, textAlign: "right" }}>\uD83C\uDFAF \u05D4\u05D9\u05E2\u05D3\u05D9\u05DD \u05E9\u05DC\u05D9</div>' + PROFILE_SECTION
);

fs.mkdirSync("src", { recursive: true });
fs.writeFileSync("src/App.jsx", source);
console.log("Wrote src/App.jsx (" + source.length + " bytes from " + chunks.length + " encoded chunks)");
