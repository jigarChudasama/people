import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "peeps");
const outPath = path.join(root, "public", "peeps-bundle.json");

function prepareSvg(raw) {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/(<g id="head\/)/, '<g class="bobbing">$1')
    .replace(/(<\/g>\s*<\/g>\s*<\/g>\s*<\/g>\s*<\/svg>)/, "</g>$1");
}

const out = {};
for (let i = 1; i <= 105; i += 1) {
  const raw = fs.readFileSync(path.join(dir, `peep-${i}.svg`), "utf8");
  out[i] = prepareSvg(raw);
}

fs.writeFileSync(outPath, JSON.stringify(out));
const mb = (fs.statSync(outPath).size / 1e6).toFixed(2);
console.log(`Wrote public/peeps-bundle.json (${mb} MB)`);
