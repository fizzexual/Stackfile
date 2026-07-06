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

// next.config header rules are NOT applied with a custom server, so we set
// security headers here on every response.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function applySecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains",
  );
}

app.prepare().then(() => {
  createServer((req, res) => {
    // Drop Next's X-Powered-By header.
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (String(name).toLowerCase() === "x-powered-by") return res;
      return originalSetHeader(name, value);
    };

    applySecurityHeaders(res);

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
