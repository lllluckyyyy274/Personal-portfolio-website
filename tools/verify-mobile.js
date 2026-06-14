const fs = require("fs");
const Module = require("module");
const path = require("path");

const bundledNodeModules = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules"
);
const bundledPnpmModules = path.join(bundledNodeModules, ".pnpm", "node_modules");
if (fs.existsSync(bundledNodeModules) && !module.paths.includes(bundledNodeModules)) {
  module.paths.push(bundledNodeModules);
}
if (fs.existsSync(bundledPnpmModules) && !module.paths.includes(bundledPnpmModules)) {
  module.paths.push(bundledPnpmModules);
}
Module._initPaths();

const { chromium } = require("playwright");
const { createStaticServer } = require("./serve-static");

const pages = [
  "/",
  "/works.html",
  "/about.html",
  "/xung.html",
  "/tomatoo.html"
];

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

const screenshotDir = path.resolve(__dirname, "..", "mobile-check");
const server = createStaticServer();

function listen() {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

async function main() {
  const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!executablePath) {
    throw new Error("No Chrome or Edge executable found for mobile verification.");
  }

  fs.mkdirSync(screenshotDir, { recursive: true });

  const address = await listen();
  const baseUrl = `http://${address.address}:${address.port}`;
  const browser = await chromium.launch({ executablePath });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const failures = [];

  for (const route of pages) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth
    }));
    const overflow = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth) - metrics.innerWidth;
    console.log(`${route} viewport=${metrics.innerWidth}px overflow=${overflow}px`);

    if (overflow > 2) {
      failures.push(`${route} has ${overflow}px horizontal overflow`);
    }

    const name = route === "/" ? "index" : route.replace("/", "").replace(".html", "");
    await page.screenshot({
      path: path.join(screenshotDir, `${name}-390.jpg`),
      type: "jpeg",
      quality: 82,
      fullPage: false
    });
  }

  await browser.close();

  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

main()
  .finally(() => {
    server.close();
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
