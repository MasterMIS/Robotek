import { NextRequest, NextResponse } from "next/server";
import { getFieldDriverRecords, addFieldDriverRecord, updateFieldDriverCheckOut } from "@/lib/sheets/field-driver-sheets";
import { uploadBase64ToDrive } from "@/lib/google-drive";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FIELD_DRIVER_FOLDER_ID = "1SQMqapbD4fFCdNGC8QKeJwmyg-toUSFF";

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
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const records = await getFieldDriverRecords();
    const userRecords = records.filter(r => String(r.userId) === String(userId));

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split('T')[0];

    const normalizedHistory = userRecords.map(r => {
      return {
        ...r,
        date: normalizeDate(r.date)
      };
    });

    const todayRecord = normalizedHistory.find(r => r.date === todayStr);

    let currentStatus: 'IDLE' | 'CHECKED_IN' | 'COMPLETED' = 'IDLE';
    let lastCheckIn = null;
    let odometerIn = null;

    if (todayRecord) {
      if (todayRecord.outTime && todayRecord.outTime !== "-") {
        currentStatus = 'COMPLETED';
      } else if (todayRecord.inTime) {
        currentStatus = 'CHECKED_IN';
        lastCheckIn = todayRecord.inTime;
        odometerIn = todayRecord.odometerIn;
      }
    }

    return NextResponse.json({ history: normalizedHistory, currentStatus, lastCheckIn, odometerIn, todayRecord });
  } catch (error) {
    console.error("GET Field Driver Error:", error);
    return NextResponse.json({ error: "Failed to fetch field driver attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, userName, latitude, longitude, address, photo, odometer } = body;
    
    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required data (userId and action are mandatory)" }, { status: 400 });
    }

    let photoUrl = "";
    if (photo && photo.startsWith('data:')) {
      const fileId = await uploadBase64ToDrive(photo, FIELD_DRIVER_FOLDER_ID);
      photoUrl = fileId || "";
    } else {
      photoUrl = photo || "";
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const dateStr = istNow.toISOString().split('T')[0];
    const timeStr = now.toISOString();
    const locationStr = address || `${latitude},${longitude}`;

    if (action === 'CHECK_IN') {
      const id = `FD-${Date.now()}`;
      await addFieldDriverRecord({
        id,
        userId: String(userId),
        userName,
        date: dateStr,
        inTime: timeStr,
        outTime: "",
        status: "IN",
        inLocation: locationStr,
        outLocation: "",
        odometerIn: String(odometer || ""),
        odometerOut: "",
        odometerPhotoIn: photoUrl,
        odometerPhotoOut: "",
        totalKm: ""
      });

      return NextResponse.json({ success: true });

    } else if (action === 'CHECK_OUT') {
      const records = await getFieldDriverRecords();
      const todayRecord = records.find(r =>
        String(r.userId) === String(userId) &&
        normalizeDate(r.date) === dateStr &&
        r.status === 'IN'
      );

      if (!todayRecord) return NextResponse.json({ error: "Active check-in not found" }, { status: 404 });

      // Calculate total KM
      const inKm = parseFloat(todayRecord.odometerIn);
      const outKm = parseFloat(odometer);
      let totalKm = "";
      if (!isNaN(inKm) && !isNaN(outKm)) {
        totalKm = String(Math.max(0, outKm - inKm));
      }

      await updateFieldDriverCheckOut(
        todayRecord.id, 
        timeStr, 
        "COMPLETED", 
        locationStr, 
        String(odometer || ""), 
        photoUrl, 
        totalKm
      );

      return NextResponse.json({ success: true, totalKm });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Field Driver API Error:", error);
    return NextResponse.json({ 
      error: "Failed to update field driver attendance", 
      details: error.message || String(error) 
    }, { status: 500 });
  }
}
