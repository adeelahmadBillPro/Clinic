import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  cloudinaryEnabled,
  sniffImageMime,
  uploadImageBuffer,
} from "@/lib/cloudinary";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  if (!cloudinaryEnabled) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Image hosting not configured. Ask an admin to set CLOUDINARY_* env vars.",
      },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: "No file" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Image too large (max 4MB)" },
      { status: 400 },
    );
  }

  // Magic-byte check beats the client-supplied file.type header — a
  // malicious upload can set Content-Type to anything.
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageMime(buf);
  if (!sniffed) {
    return NextResponse.json(
      { success: false, error: "Only PNG, JPEG or WEBP images allowed" },
      { status: 400 },
    );
  }

  // Folder per-clinic (or per-user for platform accounts) so one tenant can't
  // enumerate or overwrite another's asset ids.
  const folder = session.user.clinicId
    ? `clinicos/${session.user.clinicId}/avatars`
    : `clinicos/_platform/${session.user.id}/avatars`;

  try {
    const uploaded = await uploadImageBuffer(buf, folder);
    return NextResponse.json({
      success: true,
      data: { url: uploaded.url, publicId: uploaded.publicId },
    });
  } catch (err) {
    console.error("[upload/avatar] cloudinary error:", err);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 },
    );
  }
}
