import { NextResponse } from "next/server";
import { followUpService } from "@/lib/sales-sheets";

export async function GET() {
  const allFollowUps = await followUpService.getAll();
  const headers = await followUpService.getHeaders();
  const hMap = await followUpService.getHeaderMap();
  return NextResponse.json({
    headers,
    hMap,
    allFollowUps
  });
}
