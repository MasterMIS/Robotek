import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/google-sheets";
import { attendanceService } from "@/lib/sheets/attendance-sheets";
import { leaveRequestService } from "@/lib/leave-sheets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const [users, attendance, leaves] = await Promise.all([
      getUsers(),
      attendanceService.getAll(),
      leaveRequestService.getAll()
    ]);

    return NextResponse.json({
      users,
      attendance: attendance.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
      leaves: leaves.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())
    });
  } catch (error) {
    console.error("Attendance Master API Error:", error);
    return NextResponse.json({ error: "Failed to fetch master data" }, { status: 500 });
  }
}
