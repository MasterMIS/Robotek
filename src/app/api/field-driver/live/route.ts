import { NextRequest, NextResponse } from "next/server";
import { addOrUpdateLiveLocationJSON, getLiveLocationsJSON } from "@/lib/sheets/field-driver-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, lat, lng } = await req.json();

    if (!userId || !lat || !lng) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const dateStr = istNow.toISOString().split('T')[0];
    const timeStr = istNow.toISOString();

    await addOrUpdateLiveLocationJSON(
      String(userId),
      userName || "Unknown",
      dateStr,
      { time: timeStr, lat: String(lat), lng: String(lng) }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Live Tracking API Error:", error);
    return NextResponse.json({ 
      error: "Failed to log live location", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    
    if (!dateStr) {
       return NextResponse.json({ error: "Date parameter is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const records = await getLiveLocationsJSON(dateStr);
    
    return NextResponse.json({ records });
  } catch (error) {
    console.error("GET Live Tracking Error:", error);
    return NextResponse.json({ error: "Failed to fetch live locations" }, { status: 500 });
  }
}
