import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }
    const resolved = path.normalize(path.join(rootDir, pathname));
    if (!resolved.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    const body = await readFile(resolved);
    response.writeHead(200, {
      "Content-Type": mime[path.extname(resolved).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not Found");
  }
});

function listen(port, attempt = 0) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < 12) {
      listen(port + 1, attempt + 1);
    } else {
      console.error(error);
      process.exit(1);
    }
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`潮汐演示已启动: http://localhost:${port}`);
  });
}

listen(4173);
