import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/google-sheets";
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

Amplify.configure(outputs);
const client = generateClient<Schema>({ authMode: 'apiKey' });

// Helper to fetch all records from AWS (handling pagination)
async function fetchAWSData(model: any) {
  let allRecords: any[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response: any = await model.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);
  return allRecords;
}

export async function GET(req: NextRequest) {
  try {
    const [users, attendance, leaves] = await Promise.all([
      getUsers(),
      fetchAWSData(client.models.AttendanceRecord),
      fetchAWSData(client.models.LeaveRequest)
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
