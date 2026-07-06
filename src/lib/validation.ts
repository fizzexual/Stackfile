import { z } from "zod";

/** True if the string contains ASCII control characters (0x00–0x1f or 0x7f). */
function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

export const fileOrFolderName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(255, "Name is too long")
  .refine((n) => !hasControlChars(n), "Name contains invalid characters")
  .refine(
    (n) => !n.includes("/") && !n.includes("\\"),
    "Name cannot contain slashes",
  )
  .refine((n) => n !== "." && n !== "..", "Invalid name");

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Tag is required")
  .max(60, "Tag is too long")
  .refine((n) => !hasControlChars(n), "Tag contains invalid characters");

export const shareOptionsSchema = z.object({
  password: z.string().max(200).optional(),
  expiresInDays: z.number().int().min(0).max(365).optional(),
});

/**
 * Make an uploaded filename safe for storage/display: drop control chars,
 * replace path separators, block leading dots, cap length. Never empty.
 */
export function sanitizeFilename(name: string): string {
  let cleaned = "";
  for (const ch of name) {
    const c = ch.charCodeAt(0);
    if (c < 0x20 || c === 0x7f) continue;
    cleaned += ch === "/" || ch === "\\" ? "_" : ch;
  }
  cleaned = cleaned.replace(/^\.+/, "").trim().slice(0, 255);
  return cleaned.length > 0 ? cleaned : "untitled";
}
