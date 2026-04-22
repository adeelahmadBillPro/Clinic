import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

// Safe filename: cuid/uuid-style + known image extension
const NAME_RE = /^[A-Za-z0-9\-_]+\.(png|jpe?g|webp)$/i;

const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name } = await ctx.params;
  if (!NAME_RE.test(name)) {
    return NextResponse.json(
      { success: false, error: "Invalid filename" },
      { status: 400 },
    );
  }

  const dir = path.join(process.cwd(), "uploads", "avatars");
  const filePath = path.join(dir, name);

  // Paranoid path-traversal guard — filePath must still be under dir
  if (!filePath.startsWith(dir)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json(
      { success: false, error: "Not found" },
      { status: 404 },
    );
  }

  const buf = await readFile(filePath);
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  const mime = CONTENT_TYPE[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
