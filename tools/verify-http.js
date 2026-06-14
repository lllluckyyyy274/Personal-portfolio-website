const { createStaticServer } = require("./serve-static");

const pages = [
  "/",
  "/works.html",
  "/about.html",
  "/xung.html",
  "/tomatoo.html",
  "/idriver.html",
  "/mojiang.html",
  "/nutriai.html",
  "/styles.css",
  "/script.js"
];

const server = createStaticServer();

function listen() {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}

async function verify() {
  const address = await listen();
  const baseUrl = `http://${address.address}:${address.port}`;
  const failures = [];

  for (const page of pages) {
    const response = await fetch(`${baseUrl}${page}`);
    console.log(`${page} ${response.status} ${response.headers.get("content-type")}`);
    if (!response.ok) failures.push(`${page} returned ${response.status}`);
  }

  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

verify()
  .finally(() => {
    server.close();
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
