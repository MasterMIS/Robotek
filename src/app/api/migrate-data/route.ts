import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
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
  const errors: string[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await Promise.allSettled(chunk.map(item => createFn(item)));
    count += results.filter(r => r.status === 'fulfilled').length;
    
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed.length > 0) {
      const errorStrings = failed.map(f => f.reason?.message || String(f.reason));
      errors.push(...errorStrings);
      console.error(`${failed.length} items failed in chunk...`, errorStrings[0]);
    }
  }

  if (errors.length > 0) {
     throw new Error(`DynamoDB rejected ${errors.length} inserts. First error: ${errors[0]}`);
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

    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "1000000", 10);

    // Safety Check: Ensure the requested model exists in the generated client
    const getModel = (name: string) => {
      const model = (client.models as any)[name];
      if (!model) {
        throw new Error(`CRITICAL: Model '${name}' is not defined in the Amplify client. This usually means the backend deployment skipped this table or your amplify_outputs.json is outdated.`);
      }
      return model;
    };

    switch (module) {
      case "o2d": {
        console.log("Fetching O2D data from Google Sheets...");
        const fullData = await getO2Ds();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} O2D records (offset: ${offset})...`);
        const model = getModel("O2DRecord");
        count = await batchInsert(data, (item) =>
          model.create({
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
        const fullData = await getI2RItems();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} I2R records (offset: ${offset})...`);
        const model = getModel("I2RRecord");
        count = await batchInsert(data, (item) =>
          model.create({
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
        const fullData = await getIMSItems();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} IMS records (offset: ${offset})...`);
        const model = getModel("IMSItem");
        count = await batchInsert(data, (item) =>
          model.create({
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
        const fullData = await getParties();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} party records (offset: ${offset})...`);
        const model = getModel("Party");
        count = await batchInsert(data, (item) =>
          model.create({
            ...item,
            id: item.id || `PARTY-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "attendance": {
        console.log("Fetching Attendance & Leave data from Google Sheets...");
        
        // Modules under Attendance & Leave: AttendanceRecord, LeaveRequest, LeaveRemark
        const { getLeaveRequests, getLeaveRemarks } = await import("@/lib/sheets/attendance-sheets");

        const [fullAtt, fullLeaveReq, fullLeaveRem] = await Promise.all([
          getAttendanceRecords(),
          getLeaveRequests(),
          getLeaveRemarks()
        ]);

        const attData = fullAtt.slice(offset, offset + limit);
        const reqData = fullLeaveReq.slice(offset, offset + limit);
        const remData = fullLeaveRem.slice(offset, offset + limit);

        console.log(`Migrating ${attData.length} attendance, ${reqData.length} leave requests, ${remData.length} leave remarks (offset: ${offset})...`);

        const attModel = getModel("AttendanceRecord");
        const reqModel = getModel("LeaveRequest");
        const remModel = getModel("LeaveRemark");

        const attCount = await batchInsert(attData, (item) =>
          attModel.create({
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

        const reqCount = await batchInsert(reqData, (item) =>
          reqModel.create({
            ...item,
            id: item.id || `LEAVE-${Date.now()}-${Math.random()}`,
            userId: String(item.userId || item.user_id || ""),
            userName: item.userName || item.user_name || "",
            startDate: item.startDate || timestamp,
            endDate: item.endDate || timestamp,
            reason: item.reason || "",
            status: item.status || "Pending",
            updatedAt: item.updatedAt || timestamp
          })
        );

        const remCount = await batchInsert(remData, (item) =>
          remModel.create({
            ...item,
            id: item.id || `REM-${Date.now()}-${Math.random()}`,
            leaveId: String(item.leaveId || ""),
            userName: item.userName || "",
            comment: item.comment || "",
            createdAt: item.createdAt || timestamp
          })
        );

        count = Math.max(attCount, reqCount, remCount);
        break;
      }

      case "chat": {
        console.log("Fetching Chat messages from Google Sheets...");
        // Get all messages - we use a broad fetch since getMessages requires sender/receiver
        // For migration, we directly read from the sheet service
        const { messageService } = await import("@/lib/chat-sheets");
        
        const fullData = await messageService.getAll() || [];
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} chat messages (offset: ${offset})...`);
        const model = getModel("ChatMessage");
        count = await batchInsert(data, (item) =>
          model.create({
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
        const [fullCalls, fullFollowUps] = await Promise.all([
          getCallData(),
          getFollowUpData()
        ]);
        const calls = fullCalls.slice(offset, offset + limit);
        const followUps = fullFollowUps.slice(offset, offset + limit);
        console.log(`Migrating ${calls.length} call records and ${followUps.length} follow-ups (offset: ${offset})...`);

        const callModel = getModel("CallRecord");
        const followUpModel = getModel("FollowUpRecord");

        const callCount = await batchInsert(calls, (item) =>
          callModel.create({
            ...item,
            id: item.id || `CALL-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );

        const fupCount = await batchInsert(followUps, (item) =>
          followUpModel.create({
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
        const fullData = await getMeetings();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} meeting records (offset: ${offset})...`);
        const model = getModel("Meeting");
        count = await batchInsert(data, (item) =>
          model.create({
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

    return NextResponse.json({ message: "Migration successful", count, hasMore: count === limit });

  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message || "Failed to migrate" }, { status: 500 });
  }
}
