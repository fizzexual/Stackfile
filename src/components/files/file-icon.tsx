import {
  File as FileGeneric,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

const CODE_EXT = new Set([
  "js", "ts", "tsx", "jsx", "json", "html", "css", "scss", "py", "go", "rs",
  "java", "c", "cpp", "h", "sh", "rb", "php", "sql", "yml", "yaml", "toml",
]);
const ARCHIVE_EXT = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]);

/** Pick a Lucide icon + brand tint for a file by mime/extension. */
export function iconForFile(
  name: string,
  mime: string,
): { Icon: LucideIcon; tint: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (mime.startsWith("image/")) return { Icon: FileImage, tint: "text-brand-magenta" };
  if (mime.startsWith("video/")) return { Icon: FileVideo, tint: "text-brand-purple" };
  if (mime.startsWith("audio/")) return { Icon: FileAudio, tint: "text-brand-coral" };
  if (ext === "pdf") return { Icon: FileText, tint: "text-negative" };
  if (CODE_EXT.has(ext)) return { Icon: FileCode, tint: "text-positive" };
  if (ARCHIVE_EXT.has(ext)) return { Icon: FileArchive, tint: "text-brand-coral" };
  if (mime.startsWith("text/") || ["txt", "md", "rtf", "doc", "docx"].includes(ext))
    return { Icon: FileText, tint: "text-muted" };

  return { Icon: FileGeneric, tint: "text-muted" };
}
