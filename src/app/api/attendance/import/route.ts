import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsers } from "@/lib/google-sheets";
import { upsertAttendanceRecords, type AttendanceRecord } from "@/lib/sheets/attendance-sheets";
import { buildIstIsoTimestamp, type ParsedPunchRecord } from "@/lib/utils/punchMachineParser";
import { isWeeklyOffDateString, getWeeklyOffLabel } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ImportError {
  userCode: string;
  date: string;
  reason: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roleUpper = String((session.user as { role?: string }).role || "").toUpperCase();
    if (roleUpper !== "ADMIN" && roleUpper !== "EA") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const incomingRecords = (body.records || []) as ParsedPunchRecord[];

    if (!Array.isArray(incomingRecords) || incomingRecords.length === 0) {
      return NextResponse.json({ error: "No records to import" }, { status: 400 });
    }

    const dedupedRecords = Array.from(
      incomingRecords.reduce((map, record) => {
        const key = `${String(record.userCode || "").trim().toUpperCase()}-${record.date}`;
        map.set(key, record);
        return map;
      }, new Map<string, ParsedPunchRecord>()).values()
    );

    const users = await getUsers();
    const userByCode = new Map(
      users.map((user) => [String(user.id).trim().toUpperCase(), user])
    );

    const attendanceRecords: AttendanceRecord[] = [];
    const errors: ImportError[] = [];
    let skipped = 0;

    for (const record of dedupedRecords) {
      const userCode = String(record.userCode || "").trim().toUpperCase();
      const matchedUser = userByCode.get(userCode);

      if (!matchedUser) {
        skipped++;
        errors.push({
          userCode,
          date: record.date,
          reason: "Unknown user code",
        });
        continue;
      }

      if (!record.inTime && !record.outTime) {
        skipped++;
        errors.push({
          userCode,
          date: record.date,
          reason: "Missing in and out time",
        });
        continue;
      }

      if (isWeeklyOffDateString(matchedUser.office, record.date)) {
        skipped++;
        errors.push({
          userCode,
          date: record.date,
          reason: `${getWeeklyOffLabel(matchedUser.office)} weekly off day`,
        });
        continue;
      }

      const inTime = record.inTime
        ? buildIstIsoTimestamp(record.date, record.inTime)
        : "";
      const outTime = record.outTime
        ? buildIstIsoTimestamp(record.date, record.outTime)
        : "";

      attendanceRecords.push({
        id: `ATT-PUNCH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: String(matchedUser.id),
        userName: matchedUser.username,
        date: inTime || outTime,
        inTime,
        outTime,
        status: outTime ? "COMPLETED" : "IN",
        inPhoto: "",
        outPhoto: "",
        inLocation: "Punch Machine Import",
        outLocation: "",
      });
    }

    const { imported, updated } = await upsertAttendanceRecords(attendanceRecords);

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      errors,
    });
  } catch (error: any) {
    console.error("POST /api/attendance/import error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import attendance" },
      { status: 500 }
    );
  }
}
