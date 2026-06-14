const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif"]);

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function findLocalRefs(html) {
  const refs = [];
  const attrPattern = /\s(?:src|href)=["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(html))) {
    const value = match[1];
    if (!value || value.startsWith("#") || value.startsWith("data:") || /^https?:\/\//i.test(value) || /^mailto:/i.test(value)) {
      continue;
    }
    refs.push(value.split("#")[0].split("?")[0]);
  }
  return refs;
}

let missingLoading = 0;
let missingDimensions = 0;
let missingDescriptions = 0;
let brokenRefs = 0;
const referencedImages = new Set();

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const hasDescription = /meta\s+name=["']description["']/i.test(html);
  if (!hasDescription) missingDescriptions += 1;

  for (const tag of imgTags) {
    if (!/\sloading=/i.test(tag)) missingLoading += 1;
    if (!/\swidth=/i.test(tag) || !/\sheight=/i.test(tag)) missingDimensions += 1;
  }

  for (const ref of findLocalRefs(html)) {
    const absoluteRef = path.resolve(root, decodeURIComponent(ref));
    if (!absoluteRef.startsWith(root) || !fs.existsSync(absoluteRef)) {
      brokenRefs += 1;
      console.log(`[broken-ref] ${file}: ${ref}`);
    } else if (imageExtensions.has(path.extname(absoluteRef).toLowerCase())) {
      referencedImages.add(absoluteRef);
    }
  }
}

const assets = walk(path.join(root, "assets")).filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));
const totalAssetBytes = assets.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const referencedImageBytes = [...referencedImages].reduce((sum, file) => sum + fs.statSync(file).size, 0);
const largestAssets = assets
  .map((file) => ({ file: path.relative(root, file), size: fs.statSync(file).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 10);

console.log(`HTML files: ${htmlFiles.length}`);
console.log(`Image assets: ${assets.length}`);
console.log(`Total image weight: ${(totalAssetBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Referenced image weight: ${(referencedImageBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Missing meta descriptions: ${missingDescriptions}`);
console.log(`Images missing loading: ${missingLoading}`);
console.log(`Images missing width/height: ${missingDimensions}`);
console.log(`Broken local references: ${brokenRefs}`);
console.log("Largest image assets:");
for (const asset of largestAssets) {
  console.log(`- ${asset.file}: ${(asset.size / 1024 / 1024).toFixed(2)} MB`);
}

if (missingDescriptions || missingLoading || missingDimensions || brokenRefs) {
  process.exitCode = 1;
}
