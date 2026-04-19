import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Schema } from '@/../amplify/data/resource';
import { getUsers } from "@/lib/google-sheets";
import { parseLatLong, getShortestDistance } from "@/lib/locationUtils";

const client = generateClient<Schema>({ authMode: 'apiKey' });

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper: Resolve hybrid image URLs (Drive or S3)
async function resolveUrl(path: string | null | undefined): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  try {
    const url = await getUrl({ path, options: { validateObjectExistence: false, expiresIn: 3600 } });
    return url.url.toString();
  } catch (err) {
    console.error(`Error resolving S3 path: ${path}`, err);
    return path;
  }
}

async function fetchAllAttendance() {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await client.models.AttendanceRecord.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);

  // Resolve media URLs
  return await Promise.all(allRecords.map(async (row) => {
    const resolvedRow = { ...row };
    if (row.inPhoto) resolvedRow.inPhoto = await resolveUrl(row.inPhoto);
    if (row.outPhoto) resolvedRow.outPhoto = await resolveUrl(row.outPhoto);
    return resolvedRow;
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const records = await fetchAllAttendance();
    const userRecords = records.filter(r => String(r.userId) === String(userId));

    // Get today in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const todayStr = istNow.toISOString().split('T')[0];

    const normalizedHistory = userRecords.map(r => ({
      ...r,
      date: (r.date || '').split('T')[0]
    }));

    const todayRecord = normalizedHistory.find(r => r.date === todayStr);

    let currentStatus: 'IDLE' | 'CHECKED_IN' | 'COMPLETED' = 'IDLE';
    let lastCheckIn = null;

    if (todayRecord) {
      if (todayRecord.outTime) {
        currentStatus = 'COMPLETED';
      } else if (todayRecord.inTime) {
        currentStatus = 'CHECKED_IN';
        lastCheckIn = todayRecord.inTime;
      }
    }

    return NextResponse.json({ history: normalizedHistory, currentStatus, lastCheckIn });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, userId, userName, latitude, longitude, photo } = await req.json();
    if (!userId || !action) return NextResponse.json({ error: "Missing data" }, { status: 400 });

    // Photo upload: base64 → S3. Hybrid approach: old Drive URLs stored as-is
    let photoUrl = "";
    if (photo && photo.startsWith('data:')) {
      // New photo — upload to S3
      const base64Data = photo.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const contentType = photo.split(';')[0].split(':')[1] || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';
      const path = `attendance/${userId}/${Date.now()}.${ext}`;

      await uploadData({
        path,
        data: buffer,
        options: { contentType }
      }).result;

      photoUrl = path; // Store path; UI will resolve via S3 signed URL
    } else if (photo) {
      // Old Google Drive URL — keep as-is
      photoUrl = photo;
    }

    // Get today's IST date
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const dateStr = istNow.toISOString().split('T')[0];
    const timeStr = now.toISOString();

    if (action === 'CHECK_IN') {
      // Optional: validate location
      const allUsers = await getUsers();
      const user = allUsers.find(u => String(u.id) === String(userId));
      if (user?.late_long) {
        const registeredPoints = parseLatLong(user.late_long);
        if (registeredPoints && latitude && longitude) {
          getShortestDistance(latitude, longitude, registeredPoints);
        }
      }

      const id = `ATT-${Date.now()}`;
      const { errors } = await client.models.AttendanceRecord.create({
        id,
        userId: String(userId),
        userName,
        date: dateStr,
        inTime: timeStr,
        outTime: "",
        status: "IN",
        inPhoto: photoUrl,
        outPhoto: "",
        created_at: timeStr,
        updated_at: timeStr
      });

      if (errors) {
        console.error("Amplify Create Error:", errors);
        return NextResponse.json({ error: "Failed to check in" }, { status: 500 });
      }

      return NextResponse.json({ success: true });

    } else if (action === 'CHECK_OUT') {
      const records = await fetchAllAttendance();
      const todayRecord = records.find(r =>
        String(r.userId) === String(userId) &&
        (r.date || '').split('T')[0] === dateStr &&
        r.status === 'IN'
      );

      if (!todayRecord) return NextResponse.json({ error: "Active check-in not found" }, { status: 404 });

      const { errors } = await client.models.AttendanceRecord.update({
        id: todayRecord.id,
        outTime: timeStr,
        status: "COMPLETED",
        outPhoto: photoUrl,
        updated_at: timeStr
      });

      if (errors) {
        console.error("Amplify Update Error:", errors);
        return NextResponse.json({ error: "Failed to check out" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
