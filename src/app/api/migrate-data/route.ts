import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/api';
import { Schema } from '@/../amplify/data/resource';

// Google Sheets data sources
import { getO2Ds } from "@/lib/o2d-sheets";
import { getI2RItems } from "@/lib/i2r-sheets";
import { getIMSItems } from "@/lib/ims-sheets";
import { getParties } from "@/lib/party-management-sheets";
import { getAttendanceRecords } from "@/lib/sheets/attendance-sheets";
import { getMessages } from "@/lib/chat-sheets";
import { getCallData, getFollowUpData } from "@/lib/scot-sheets";
import { getMeetings } from "@/lib/meeting-sheets";
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>({ authMode: 'apiKey' });

// Helper: batch insert with chunking to avoid overwhelming the API
async function batchInsert(items: any[], createFn: (item: any) => Promise<any>) {
  const chunkSize = 25;
  let count = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await Promise.allSettled(chunk.map(item => createFn(item)));
    count += results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`${failed.length} items failed in this chunk`);
    }
  }
  return count;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");

    if (!module) {
      return NextResponse.json({ error: "Module parameter required" }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    let count = 0;

    switch (module) {
      case "o2d": {
        console.log("Fetching O2D data from Google Sheets...");
        const data = await getO2Ds();
        console.log(`Migrating ${data.length} O2D records...`);
        count = await batchInsert(data, (item) =>
          client.models.O2DRecord.create({
            ...item,
            id: item.id || `O2D-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "i2r": {
        console.log("Fetching I2R data from Google Sheets...");
        const data = await getI2RItems();
        console.log(`Migrating ${data.length} I2R records...`);
        count = await batchInsert(data, (item) =>
          client.models.I2RRecord.create({
            ...item,
            id: item.id || `I2R-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "ims": {
        console.log("Fetching IMS data from Google Sheets...");
        const data = await getIMSItems();
        console.log(`Migrating ${data.length} IMS records...`);
        count = await batchInsert(data, (item) =>
          client.models.IMSRecord.create({
            ...item,
            id: item.id || `IMS-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "party": {
        console.log("Fetching Party Management data from Google Sheets...");
        const data = await getParties();
        console.log(`Migrating ${data.length} party records...`);
        count = await batchInsert(data, (item) =>
          client.models.PartyRecord.create({
            ...item,
            id: item.id || `PARTY-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "attendance": {
        console.log("Fetching Attendance data from Google Sheets...");
        const data = await getAttendanceRecords();
        console.log(`Migrating ${data.length} attendance records...`);
        count = await batchInsert(data, (item) =>
          client.models.AttendanceRecord.create({
            ...item,
            id: item.id || `ATT-${Date.now()}-${Math.random()}`,
            userId: String(item.userId || item.user_id || ""),
            userName: item.userName || item.user_name || "",
            inPhoto: item.inPhoto || item.in_photo || "",
            outPhoto: item.outPhoto || item.out_photo || "",
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "chat": {
        console.log("Fetching Chat messages from Google Sheets...");
        // Get all messages - we use a broad fetch since getMessages requires sender/receiver
        // For migration, we directly read from the sheet service
        const { ChatService } = await import("@/lib/chat-sheets");
        const chatService = new (ChatService as any)();
        const data = await chatService.getAll?.() || [];
        console.log(`Migrating ${data.length} chat messages...`);
        count = await batchInsert(data, (item) =>
          client.models.ChatMessage.create({
            ...item,
            id: item.id || `MSG-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "scot": {
        console.log("Fetching Scot data from Google Sheets...");
        const [calls, followUps] = await Promise.all([
          getCallData(),
          getFollowUpData()
        ]);
        console.log(`Migrating ${calls.length} call records and ${followUps.length} follow-ups...`);

        const callCount = await batchInsert(calls, (item) =>
          client.models.CallRecord.create({
            ...item,
            id: item.id || `CALL-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );

        const fupCount = await batchInsert(followUps, (item) =>
          client.models.FollowUpRecord.create({
            ...item,
            id: item.id || `FUP-${Date.now()}-${Math.random()}`,
            createdAt: item.createdAt || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );

        count = callCount + fupCount;
        break;
      }

      case "scheduler": {
        console.log("Fetching Scheduler Meetings from Google Sheets...");
        const data = await getMeetings();
        console.log(`Migrating ${data.length} meeting records...`);
        count = await batchInsert(data, (item) =>
          client.models.SchedulerMeeting.create({
            ...item,
            id: item.id || `MEET-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown module: ${module}` }, { status: 400 });
    }

    return NextResponse.json({ message: "Migration successful", count });

  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message || "Failed to migrate" }, { status: 500 });
  }
}
