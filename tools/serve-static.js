const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendFile(res, filePath, statusCode = 200) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(statusCode, {
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    res.end(data);
  });
}

function createStaticServer(baseDir = root) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
    const filePath = path.resolve(baseDir, relativePath);

    if (!filePath.startsWith(baseDir)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(baseDir, "404.html"), 404);
  });
}

if (require.main === module) {
  createStaticServer().listen(port, host, () => {
    console.log(`Portfolio site available at http://${host}:${port}`);
  });
}

module.exports = { createStaticServer };
