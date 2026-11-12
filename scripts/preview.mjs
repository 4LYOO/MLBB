// Prévisualisation locale du site exporté (dossier out/), avec le même préfixe que GitHub Pages.
//   npm run preview   → http://localhost:4000<NEXT_PUBLIC_BASE_PATH>/
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
const root = path.resolve("out");
const port = Number(process.env.PORT) || 4000;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };

http
  .createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (base && p.startsWith(base)) p = p.slice(base.length) || "/";
    let file = path.join(root, p);
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) file = path.join(root, "404.html");
    res.writeHead(file.endsWith("404.html") && !p.endsWith("404.html") ? 404 : 200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Aperçu : http://localhost:${port}${base}/`));
