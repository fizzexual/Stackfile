/** Image metadata extracted from EXIF (stored on the file row as jsonb). */
export type ImageMeta = {
  width?: number;
  height?: number;
  /** EXIF DateTimeOriginal as ISO string. */
  takenAt?: string;
  make?: string;
  model?: string;
  lens?: string;
  iso?: number;
  fNumber?: number;
  exposure?: string; // e.g. "1/200"
  focalLength?: number;
  lat?: number;
  lng?: number;
};
