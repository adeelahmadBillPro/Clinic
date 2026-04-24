import { v2 as cloudinary } from "cloudinary";

// Configure once at module load. Env vars are read via process.env so they
// stay on the server only.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export const cloudinaryEnabled = Boolean(
  CLOUD_NAME && API_KEY && API_SECRET,
);

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  });
}

export { cloudinary };

export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

/**
 * Upload a buffer as an image to Cloudinary under the given folder.
 * Folder is namespaced by clinic so tenants can't touch each other's assets.
 *
 * Why uploads move off local disk:
 *  - Serverless platforms have an ephemeral FS (uploads vanish between deploys).
 *  - The prior `/api/files/avatars/*` route served untrusted local files on
 *    the app origin, which widens XSS blast radius if an attacker smuggled in
 *    something disguised as an image.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string,
): Promise<UploadedImage> {
  if (!cloudinaryEnabled) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.",
    );
  }
  return await new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Sanitise any SVG / animation bombs into a plain static image.
        transformation: [
          { width: 512, height: 512, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Magic-byte sniffing — don't trust the client-supplied Content-Type or
 * filename extension. Only the first handful of bytes tell the truth.
 * Supports PNG, JPEG, WEBP.
 */
export function sniffImageMime(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // WEBP: "RIFF" ... "WEBP" at offset 8
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
