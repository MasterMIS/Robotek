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

      case "user": {
        console.log("Fetching User data from Google Sheets...");
        const { getUsers, getDropdownData } = await import("@/lib/google-sheets");
        const [fullUsers, fullDropdown] = await Promise.all([getUsers(), getDropdownData()]);

        const users = fullUsers.slice(offset, offset + limit);
        console.log(`Migrating ${users.length} users (offset: ${offset})...`);
        const userModel = getModel("User");
        
        const dropdownModel = getModel("Dropdown");
        const dropdownPayload = [
            ...(fullDropdown.departments || []).map(d => ({ type: "department", value: d })),
            ...(fullDropdown.designations || []).map(d => ({ type: "designation", value: d }))
        ].slice(offset, offset + limit);

        const userCount = await batchInsert(users, (item) => userModel.create({
            id: item.id || `USR-${Date.now()}-${Math.random()}`,
            username: item.username || "Unknown",
            email: item.email || "unknown@example.com",
            password: item.password || "",
            phone: item.phone || "",
            role_name: item.role_name || "",
            late_long: item.late_long || "",
            image_url: item.image_url || "",
            dob: item.dob || "",
            office: item.office || "",
            designation: item.designation || "",
            department: item.department || "",
            last_active: item.last_active || "",
            permissions: item.permissions || []
        }));

        const dropCount = await batchInsert(dropdownPayload, (item) => dropdownModel.create({
            type: item.type,
            value: item.value
        }));

        count = Math.max(userCount, dropCount);
        break;
      }

      case "eamd": {
        console.log("Fetching EA-MD data from Google Sheets...");
        const { getWeeklyUpdateItems } = await import("@/lib/ea-md-sheets");
        const { getUrgentLogs } = await import("@/lib/urgent-log-sheets");
        const { getActionLogItems } = await import("@/lib/action-log-sheets");
        const { getSyncMeetings } = await import("@/lib/sync-meeting-sheets");
        const { getTeamQueryItems } = await import("@/lib/team-queries-sheets");

        const [fullWeekly, fullUrgent, fullAction, fullSync, fullTeam] = await Promise.all([
            getWeeklyUpdateItems(), getUrgentLogs(), getActionLogItems(), getSyncMeetings(), getTeamQueryItems()
        ]).catch(() => [[], [], [], [], []]); // Safe fallback if any sheet is inaccessible

        const weekly = (fullWeekly || []).slice(offset, offset + limit);
        const urgent = (fullUrgent || []).slice(offset, offset + limit);
        const action = (fullAction || []).slice(offset, offset + limit);
        const sync = (fullSync || []).slice(offset, offset + limit);
        const team = (fullTeam || []).slice(offset, offset + limit);

        const wModel = getModel("EaMdWeeklyUpdate");
        const wCount = await batchInsert(weekly, (i) => wModel.create({
            weekOf: i.weekOf || "", preparedBy: i.preparedBy || "", periodCovered: i.periodCovered || "", category: i.category || "", description: i.description || "", date: i.date || "", teamMember: i.teamMember || "", timestamp: i.timestamp || timestamp
        }));

        const uModel = getModel("EaMdUrgentLog");
        const uCount = await batchInsert(urgent, (i) => uModel.create({
            issueSummary: i.issueSummary || "", urgencyLevel: i.urgencyLevel || "", channelUsed: i.channelUsed || "", requiredFromMD: i.requiredFromMD || "", deadline: i.deadline || "", status: i.status || ""
        }));

        const aModel = getModel("EaMdActionLog");
        const aCount = await batchInsert(action, (i) => aModel.create({
            task: i.task || "", owner: i.owner || "", priority: i.priority || "", status: i.status || "", due: i.due || "", notes: i.notes || "", timestamp: i.timestamp || timestamp
        }));

        const sModel = getModel("EaMdSyncMeeting");
        const sCount = await batchInsert(sync, (i) => sModel.create({
            date: i.date || "", time: i.time || "", location: i.location || "", agenda: JSON.stringify(i.agenda || []), decisions: i.decisions || "", actionItems: JSON.stringify(i.actionItems || []), notes: i.notes || "", timestamp: i.timestamp || timestamp
        }));

        const tModel = getModel("EaMdTeamQuery");
        const tCount = await batchInsert(team, (i) => tModel.create({
            teamMember: i.teamMember || "", query: i.query || "", category: i.category || "", eaResolve: i.eaResolve?.toString() || "", status: i.status || "", eaNotes: i.eaNotes || "", timestamp: i.timestamp || timestamp
        }));

        count = Math.max(wCount, uCount, aCount, sCount, tCount);
        break;
      }

      case "delegation": {
        console.log("Fetching Delegation data from Google Sheets...");
        const { getDelegations } = await import("@/lib/delegation-sheets");
        const fullDelegations = await getDelegations();
        const dels = (fullDelegations || []).slice(offset, offset + limit);
        
        console.log(`Migrating ${dels.length} delegations (offset: ${offset})...`);
        const delModel = getModel("Delegation");

        count = await batchInsert(dels, (item) => delModel.create({
            id: item.id || `DEL-${Date.now()}-${Math.random()}`,
            title: item.title || "",
            description: item.description || "",
            assigned_by: item.assigned_by || "",
            assigned_to: item.assigned_to || "",
            department: String(item.department || ""),
            priority: item.priority || "",
            due_date: item.due_date || "",
            status: item.status || "",
            voice_note_url: item.voice_note_url || "",
            reference_docs: item.reference_docs || "",
            evidence_required: String(item.evidence_required || ""),
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
        }));
        break;
      }

      default:
    }

    return NextResponse.json({ message: "Migration successful", count, hasMore: count === limit });

  } catch (error: any) {
    console.error("Migration Error:", error);
    return NextResponse.json({ error: error.message || "Failed to migrate" }, { status: 500 });
  }
}
