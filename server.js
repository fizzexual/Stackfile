import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 4000;

const app = next({ dev });
const handle = app.getRequestHandler();

// WebDAV extension methods Next's route handlers can't receive directly.
// We rewrite them to POST + an `x-webdav-method` header so a normal route
// handler at /webdav/[[...path]] can dispatch them.
const WEBDAV_METHODS = new Set([
  "PROPFIND",
  "PROPPATCH",
  "MKCOL",
  "MOVE",
  "COPY",
  "LOCK",
  "UNLOCK",
]);

app.prepare().then(() => {
  createServer((req, res) => {
    const url = req.url || "/";
    const method = req.method || "GET";
    if (url.startsWith("/webdav") && WEBDAV_METHODS.has(method)) {
      req.headers["x-webdav-method"] = method;
      req.method = "POST";
    }
    handle(req, res);
  }).listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`> Stackfile ready on http://localhost:${port} (dev=${dev})`);
  });
});
