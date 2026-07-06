export type PreviewKind = "image" | "pdf" | "text" | "video" | "audio";

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "json", "csv", "tsv", "log", "xml", "yml", "yaml",
  "ini", "toml", "js", "mjs", "cjs", "ts", "tsx", "jsx", "css", "scss", "html",
  "htm", "svg", "py", "go", "rs", "java", "c", "h", "cpp", "sh", "rb", "php",
  "sql",
]);

/** Whether/how a file can be previewed inline in the browser. */
export function previewKind(mime: string, name: string): PreviewKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/") || TEXT_EXT.has(ext)) return "text";
  return null;
}
