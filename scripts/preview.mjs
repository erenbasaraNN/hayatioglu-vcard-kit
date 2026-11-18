import { createServer } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".vcf": "text/vcard; charset=utf-8",
  ".png": "image/png"
};

try {
  await fs.access(root);
} catch {
  console.error("Önce npm run build komutunu çalıştırın.");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  const notFound = () => response.writeHead(404, { "Content-Type": mime[".html"] }).end("Kartvizit bulunamadı.");
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (!/^\/[a-z0-9./-]*$/i.test(pathname)) return notFound();
    let file = path.resolve(root, "." + pathname);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return notFound();
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, "index.html");
    const type = mime[path.extname(file)];
    const info = await fs.stat(file);
    if (!type || !info.isFile()) return notFound();
    const headers = { "Content-Type": type, "Content-Length": info.size };
    if (path.extname(file) === ".vcf") headers["Content-Disposition"] = 'inline; filename="' + path.basename(file) + '"';
    response.writeHead(200, headers);
    if (request.method === "HEAD") return response.end();
    createReadStream(file).on("error", () => response.destroy()).pipe(response);
  } catch {
    if (!response.headersSent) notFound();
    else response.destroy();
  }
});

server.on("error", (error) => {
  console.error("Önizleme açılamadı. " + error.message);
  process.exitCode = 1;
});
server.listen(4173, "127.0.0.1", () => {
  console.log("Önizleme http://127.0.0.1:4173");
  console.log("npm run build çıktısındaki yolu açın. Örnek /vcard/eren-basaran/");
});
