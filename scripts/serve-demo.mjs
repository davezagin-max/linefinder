// Serve the static demo build (out/) under /linefinder/, the way GitHub Pages does.
//   npm run demo:build && npm run demo:preview  → http://localhost:3100/linefinder/
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const BASE = "/linefinder";
const PORT = Number(process.env.PORT ?? 3100);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".json": "application/json", ".txt": "text/plain", ".woff2": "font/woff2", ".png": "image/png", ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/") {
    res.writeHead(302, { Location: `${BASE}/` }).end();
    return;
  }
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end("Not found");
    return;
  }
  let file = normalize(join(ROOT, decodeURIComponent(url.pathname.slice(BASE.length))));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) file = join(ROOT, "404.html");
  res.writeHead(file.endsWith("404.html") && !url.pathname.endsWith("404.html") ? 404 : 200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Demo: http://localhost:${PORT}${BASE}/`));
