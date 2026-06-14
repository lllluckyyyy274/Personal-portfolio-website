const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const descriptions = {
  "index.html": "刘恪洋个人作品集，展示品牌视觉、UI/UX、3D建模与 AI 辅助设计项目。",
  "works.html": "刘恪洋作品集项目总览，包含品牌视觉、网页设计、产品 UI 与内容表达案例。",
  "about.html": "刘恪洋个人简介、教育经历、实习经历、技能与项目经验。",
  "nutriai.html": "NutriAI 项目详情，展示营养健康方向的品牌与界面设计。",
  "xung.html": "循迹科技 Trackio 项目详情，展示骑行智能硬件品牌、Logo、产品与 UI 体系。",
  "tomatoo.html": "Tomatoo 番茄酱品牌项目详情，展示包装、IP 与品牌视觉设计。",
  "idriver.html": "iDriver 项目详情，展示智能出行相关产品与界面设计。",
  "mojiang.html": "墨匠项目详情，展示品牌视觉与产品体验设计。",
  "404.html": "页面未找到，请返回刘恪洋个人作品集首页。"
};

const eagerImagePatterns = [
  /assets\/zjm\/zjm-mylogo\.png$/i,
  /assets\/zjm\/zjm-mypic\.png$/i,
  /assets\/about\/mypic2\.png$/i,
  /assets\/works\/[^/]+\/sy-[^/]+\.png$/i
];

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (
    buffer.length < 24 ||
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.readUInt32BE(4) !== 0x0d0a1a0a
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function localImageSize(src) {
  if (!src || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
    return null;
  }

  const cleanSrc = decodeURIComponent(src.split("#")[0].split("?")[0]);
  const filePath = path.resolve(root, cleanSrc);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    return null;
  }

  if (path.extname(filePath).toLowerCase() === ".png") {
    return pngSize(filePath);
  }

  return null;
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
}

function hasAttr(tag, name) {
  return new RegExp(`\\s${name}(=|\\s|>)`, "i").test(tag);
}

function addAttr(tag, name, value) {
  if (hasAttr(tag, name)) return tag;
  return tag.replace(/\/?>$/, ` ${name}="${value}"$&`);
}

function replaceAttr(tag, name, value) {
  if (!hasAttr(tag, name)) return addAttr(tag, name, value);
  return tag.replace(new RegExp(`\\s${name}=(["']).*?\\1`, "i"), ` ${name}="${value}"`);
}

function optimizeImageTag(tag) {
  const src = getAttr(tag, "src");
  let next = tag;

  next = addAttr(next, "decoding", "async");

  const shouldEager = eagerImagePatterns.some((pattern) => pattern.test(src.replaceAll("\\", "/")));
  next = replaceAttr(next, "loading", shouldEager ? "eager" : "lazy");

  if (shouldEager) {
    next = addAttr(next, "fetchpriority", "high");
  }

  const size = localImageSize(src);
  if (size) {
    next = addAttr(next, "width", String(size.width));
    next = addAttr(next, "height", String(size.height));
  }

  return next;
}

function ensureDescription(html, fileName) {
  if (/meta\s+name=["']description["']/i.test(html)) {
    return html;
  }

  const description = descriptions[fileName] || descriptions["index.html"];
  return html.replace(
    /(<meta\s+name=["']viewport["'][^>]*>\s*)/i,
    `$1\n  <meta name="description" content="${description}">`
  );
}

function ensureStylesheetPreload(html) {
  if (/rel=["']preload["'][^>]+href=["']styles\.css["']/i.test(html)) {
    return html;
  }

  return html.replace(
    /(\s*<link\s+rel=["']stylesheet["']\s+href=["']styles\.css["']\s*>)/i,
    `\n  <link rel="preload" href="styles.css" as="style">$1`
  );
}

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith(".html"));

for (const fileName of htmlFiles) {
  const filePath = path.join(root, fileName);
  let html = fs.readFileSync(filePath, "utf8");

  html = ensureDescription(html, fileName);
  html = ensureStylesheetPreload(html);
  html = html.replace(/<img\b[^>]*>/gi, optimizeImageTag);

  fs.writeFileSync(filePath, html);
}

console.log(`Optimized ${htmlFiles.length} HTML files.`);
