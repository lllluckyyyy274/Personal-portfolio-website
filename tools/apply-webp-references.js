const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const textFiles = fs
  .readdirSync(root)
  .filter((file) => file.endsWith(".html") || file.endsWith(".css"));

function shouldUseWebp(relativePngPath) {
  if (!relativePngPath.startsWith("assets/") || !relativePngPath.toLowerCase().endsWith(".png")) {
    return false;
  }

  const pngPath = path.resolve(root, relativePngPath);
  const webpPath = pngPath.replace(/\.png$/i, ".webp");

  if (!pngPath.startsWith(root) || !fs.existsSync(pngPath) || !fs.existsSync(webpPath)) {
    return false;
  }

  return fs.statSync(webpPath).size < fs.statSync(pngPath).size;
}

function rewritePngReference(match, before, src, after) {
  const normalized = src.replaceAll("\\", "/");
  if (!shouldUseWebp(normalized)) {
    return match;
  }

  return `${before}${src.replace(/\.png$/i, ".webp")}${after}`;
}

let replacements = 0;

for (const file of textFiles) {
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, "utf8");
  const updated = original.replace(
    /(\b(?:src|href)=["']|url\(["']?)(assets\/[^"')]+?\.png)(["']?\)|["'])/gi,
    (match, before, src, after) => {
      const next = rewritePngReference(match, before, src, after);
      if (next !== match) replacements += 1;
      return next;
    }
  );

  if (updated !== original) {
    fs.writeFileSync(filePath, updated);
  }
}

console.log(`WebP references applied: ${replacements}`);
