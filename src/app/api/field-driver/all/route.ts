import { NextRequest, NextResponse } from "next/server";
import { getFieldDriverRecords, getLiveLocationsJSON } from "@/lib/sheets/field-driver-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeDate(dateVal: string | undefined | null) {
  if (!dateVal) return '';
  let dateStr = dateVal.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [p1, p2, yyyy] = dateStr.split('/');
    let mm = p1, dd = p2;
    if (parseInt(p1) > 12) {
      dd = p1;
      mm = p2;
    }
    dateStr = `${yyyy}-${mm}-${dd}`;
  }
  return dateStr;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const [attendanceRecords, liveTrackingRecords] = await Promise.all([
      getFieldDriverRecords(),
      getLiveLocationsJSON()
    ]);

    // Format and filter attendance records
    let filteredAttendance = attendanceRecords.map(r => ({
      ...r,
      date: normalizeDate(r.date)
    }));

    // Filter live tracking records
    let filteredLiveTracking = liveTrackingRecords;

    if (dateParam) {
      filteredAttendance = filteredAttendance.filter(r => r.date === dateParam);
      filteredLiveTracking = filteredLiveTracking.filter(r => r.date === dateParam);
    }

    // Sort attendance by date descending, then time descending
    filteredAttendance.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.inTime || "").localeCompare(a.inTime || "");
    });

    return NextResponse.json({
      attendance: filteredAttendance,
      liveTracking: filteredLiveTracking
    });

  } catch (error) {
    console.error("GET Field Driver All Error:", error);
    return NextResponse.json({ error: "Failed to fetch field driver data" }, { status: 500 });
  }
}
