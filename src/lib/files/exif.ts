import sharp from "sharp";
import exifReader from "exif-reader";
import type { ImageMeta } from "./image-meta";

function formatExposure(sec: number): string {
  if (!sec || sec <= 0) return "";
  if (sec >= 1) return `${Number(sec.toFixed(1))}s`;
  return `1/${Math.round(1 / sec)}`;
}

function gpsToDecimal(dms: unknown, ref: unknown): number | undefined {
  if (!Array.isArray(dms) || dms.length < 3) return undefined;
  const d = Number(dms[0]);
  const m = Number(dms[1]);
  const s = Number(dms[2]);
  if (![d, m, s].every(Number.isFinite)) return undefined;
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return Number.isFinite(dec) ? Number(dec.toFixed(6)) : undefined;
}

/**
 * Extract image dimensions + EXIF (camera, date-taken, exposure, GPS) from a
 * buffer. Returns null for non-image/unprocessable input; never throws.
 */
export async function extractImageMeta(buf: Buffer): Promise<ImageMeta | null> {
  let md;
  try {
    md = await sharp(buf).metadata();
  } catch {
    return null;
  }

  const meta: ImageMeta = {};
  if (md.width) meta.width = md.width;
  if (md.height) meta.height = md.height;

  if (md.exif) {
    try {
      const ex = exifReader(md.exif) as {
        Image?: Record<string, unknown>;
        Photo?: Record<string, unknown>;
        GPSInfo?: Record<string, unknown>;
      };
      const image = ex.Image ?? {};
      const photo = ex.Photo ?? {};
      const gps = ex.GPSInfo ?? {};

      if (typeof image.Make === "string") meta.make = image.Make.trim();
      if (typeof image.Model === "string") meta.model = image.Model.trim();
      if (typeof photo.LensModel === "string") meta.lens = photo.LensModel.trim();

      const taken = photo.DateTimeOriginal ?? image.DateTime;
      if (taken instanceof Date && !Number.isNaN(taken.getTime())) {
        meta.takenAt = taken.toISOString();
      }

      const iso = photo.ISOSpeedRatings ?? photo.PhotographicSensitivity;
      if (typeof iso === "number") meta.iso = iso;
      else if (Array.isArray(iso) && typeof iso[0] === "number") meta.iso = iso[0];

      if (typeof photo.FNumber === "number") meta.fNumber = photo.FNumber;
      if (typeof photo.ExposureTime === "number") {
        meta.exposure = formatExposure(photo.ExposureTime);
      }
      if (typeof photo.FocalLength === "number") {
        meta.focalLength = photo.FocalLength;
      }

      const lat = gpsToDecimal(gps.GPSLatitude, gps.GPSLatitudeRef);
      const lng = gpsToDecimal(gps.GPSLongitude, gps.GPSLongitudeRef);
      if (lat !== undefined && lng !== undefined) {
        meta.lat = lat;
        meta.lng = lng;
      }
    } catch {
      // Unparseable EXIF — keep the dimensions we already have.
    }
  }

  return meta;
}
