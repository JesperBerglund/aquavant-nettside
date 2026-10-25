// Local preview: `node serve.mjs` → http://localhost:8090
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "public");
const PORT = Number(process.env.PORT) || 8090;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".mp4": "video/mp4", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  if (path.endsWith("/")) path += "index.html";
  let file = join(ROOT, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); // local preview: always fresh
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": TYPES[".html"] });
    res.end(await readFile(join(ROOT, "404.html")).catch(() => "Not found"));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`AquaVant preview: http://localhost:${PORT}`));
