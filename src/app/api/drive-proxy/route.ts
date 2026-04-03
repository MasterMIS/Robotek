import { NextRequest, NextResponse } from "next/server";
import { getDriveImageUrl } from "@/lib/drive-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");

  if (!fileId) {
    return new NextResponse("Missing file ID", { status: 400 });
  }

  try {
    const driveUrl = getDriveImageUrl(fileId);
    const res = await fetch(driveUrl);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from drive: ${res.status}`);
    }
    
    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "image/jpeg");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=31536000");

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Failed to proxy image", { status: 500 });
  }
}
