import { NextRequest, NextResponse } from "next/server";
import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../../amplify/data/resource';

// Google Sheets data sources
import { getO2Ds } from "@/lib/o2d-sheets";
import { getI2RItems } from "@/lib/i2r-sheets";
import { getIMSItems } from "@/lib/ims-sheets";
import { getParties } from "@/lib/party-management-sheets";
import { getAttendanceRecords, getLeaveRequests, getLeaveRemarks } from "@/lib/sheets/attendance-sheets";
import { messageService } from "@/lib/chat-sheets";
// Combined scot imports below
import { getMeetings } from "@/lib/meeting-sheets";
import { getUsers, getDropdownData } from "@/lib/google-sheets";
import { getWeeklyUpdateItems } from "@/lib/ea-md-sheets";
import { getUrgentLogs } from "@/lib/urgent-log-sheets";
import { getActionLogItems } from "@/lib/action-log-sheets";
import { getSyncMeetings } from "@/lib/sync-meeting-sheets";
import { getTeamQueryItems } from "@/lib/team-queries-sheets";
import { getDelegations, getDelegationRevisions, getDelegationRemarks } from "@/lib/delegation-sheets";
import { getTickets, ticketHistoryService } from "@/lib/ticket-sheets";
import { getScotData, getCallData, getFollowUpData } from "@/lib/scot-sheets";
import { Amplify } from 'aws-amplify';
import outputs from '../../../../amplify_outputs.json';

// Migration API Route - Force Refresh
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
    
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const responseData = r.value;
        if (responseData && responseData.errors) {
          // AWS Amplify returns 200 OK but injects deep GraphQL errors
          errors.push(JSON.stringify(responseData.errors));
        } else {
          count++;
        }
      } else if (r.status === 'rejected') {
        errors.push(r.reason?.message || String(r.reason));
      }
    }
    
    if (errors.length > 0) {
      console.error(`Chunk failed with GraphQL/Network errors:`, errors[0]);
      break; // Stop immediately to display error
    }
  }

  if (errors.length > 0) {
     throw new Error(`Amplify rejected inserts. First error: ${errors[0]}`);
  }

  return count;
}

// Helper: Strictly pick only fields defined in the schema to avoid GraphQL "not defined" errors
function pick(data: any, allowedFields: string[]) {
  const result: any = {};
  allowedFields.forEach(f => {
    if (data[f] !== undefined && data[f] !== null) {
      result[f] = data[f];
    }
  });
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");
    const isManual = searchParams.get("isManual") === "true";
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "50"); // Default to 50 rows for first migration

    if (!module) {
      return NextResponse.json({ error: "Module parameter required" }, { status: 400 });
    }

    // If manual, read data from request body
    let manualData: any[] = [];
    if (isManual) {
      const body = await req.json();
      manualData = body.data || [];
    }

    const timestamp = new Date().toISOString();
    let count = 0;

    // Updated getModel to handle both Sheets and Manual data
    const getModel = (name: keyof typeof client.models) => {
      const model = (client.models as any)[name];
      if (!model) {
        throw new Error(`CRITICAL: Model '${String(name)}' is not defined in the Amplify client.`);
      }
      return model;
    };

    switch (module) {
      case "o2d": {
        const fullData = isManual ? manualData : await getO2Ds();
        const data = isManual ? fullData : fullData.slice(offset, offset + limit);
        const model = getModel("O2DRecord");
        
        const o2dFields = [
          "id", "order_no", "party_name", "item_name", "item_qty", "est_amount", 
          "item_specification", "remark", "order_screenshot", "filled_by",
          "hold", "cancelled", "final_amount_1", "so_number_1", "merge_order_with_1", "upload_so_1",
          "num_of_parcel_5", "upload_pi_5", "actual_date_of_order_packed_5", "voucher_num_7",
          "order_details_checked_8", "voucher_num_51_8", "t_amt_8", "attach_bilty_9", "num_of_parcel_9",
          // Add sheet_created_at and sheet_updated_at fields
          "sheet_created_at", "sheet_updated_at"
        ];
        
        for(let i=1; i<=11; i++) {
          o2dFields.push(`planned_${i}`, `actual_${i}`, `status_${i}`);
        }

        count = await batchInsert(data, async (item) => {
          // Prepare payload with correct field names
          const payload = pick(item, o2dFields);

          // Map both 'actual_X' and 'Actual_X' from sheet to 'actual_X' for AWS
          for(let i=1; i<=11; i++) {
            const lower = item[`actual_${i}`];
            const upper = item[`Actual_${i}`];
            if (lower !== undefined && lower !== null && lower !== "") {
              payload[`actual_${i}`] = lower;
            } else if (upper !== undefined && upper !== null && upper !== "") {
              payload[`actual_${i}`] = upper;
            }
          }

          // Only add sheet_created_at and sheet_updated_at if they exist in the schema
          if (o2dFields.includes("sheet_created_at")) {
            payload.sheet_created_at = item.created_at || "";
          }
          if (o2dFields.includes("sheet_updated_at")) {
            payload.sheet_updated_at = item.updated_at || "";
          }

          if (!payload.id) {
            payload.id = `O2D-${item.order_no}-${item.item_name}`.replace(/\s+/g, '-');
          }

          try {
            // ROBUST UPSERT: Attempt update, if it has errors or throws, try create
            const upResult = await model.update(payload);
            if (upResult.errors && upResult.errors.length > 0) {
               // Update failed (likely record doesn't exist), try create
               const crResult = await model.create(payload);
               return crResult;
            }
            return upResult;
          } catch (err: any) {
            // If update threw an actual error, try create
            try {
              return await model.create(payload);
            } catch (innerErr) {
              console.error("MIGRATION ERROR ON ID:", payload.id, err);
              return null;
            }
          }
        });
        break;
      }

      case "i2r": {
        const fullData = await getI2RItems();
        const data = fullData.slice(offset, offset + limit);
        const model = getModel("I2RRecord");
        const i2rFields = [
          "id", "indend_num", "item_name", "quantity", "category", "filled_by", 
          "created_at", "updated_at", "cancelled"
        ];
        for(let i=1; i<=9; i++) {
          i2rFields.push(`planned_${i}`, `actual_${i}`, `status_${i}`);
        }

        count = await batchInsert(data, (item) =>
          model.create({
            ...pick(item, i2rFields),
            id: item.id || `I2R-${Date.now()}-${Math.random()}`,
            created_at: item.created_at || timestamp,
            updated_at: item.updated_at || timestamp
          })
        );
        break;
      }

      case "ims": {
        const fullData = await getIMSItems();
        const data = fullData.slice(offset, offset + limit);
        const model = getModel("IMSItem");
        const fields = ["id", "item_name", "est_amount_item", "gst", "final_amount"];
        count = await batchInsert(data, (item) =>
          model.create(pick(item, fields))
        );
        break;
      }

      case "party": {
        const fullData = await getParties();
        const data = fullData.slice(offset, offset + limit);
        const model = getModel("Party");
        const fields = [
          "id", "customerType", "partyName", "dateOfBirth", "partyType", 
          "salesFunnelUniqueNum", "salePersonName", "firstOrderItems", 
          "detailsAndInstructions", "remarks", "filledBy", "timestamp"
        ];
        count = await batchInsert(data, (item) =>
          model.create(pick(item, fields))
        );
        break;
      }

      case "attendance": {
        const { getLeaveRequests, getLeaveRemarks } = await import("@/lib/sheets/attendance-sheets");
        const [fullAtt, fullLeaveReq, fullLeaveRem] = await Promise.all([
          getAttendanceRecords(),
          getLeaveRequests(),
          getLeaveRemarks()
        ]);

        const attModel = getModel("AttendanceRecord");
        const reqModel = getModel("LeaveRequest");
        const remModel = getModel("LeaveRemark");

        const attFields = ["id", "userId", "userName", "date", "inTime", "outTime", "status", "inPhoto", "outPhoto"];
        const leaveFields = ["id", "userId", "userName", "startDate", "endDate", "reason", "status", "responsibility1", "responsibility2", "responsibility3", "acceptedBy", "updatedAt"];
        const remarkFields = ["id", "leaveId", "userName", "comment", "createdAt"];

        const c1 = await batchInsert(fullAtt.slice(offset, offset + limit), (i) => attModel.create({
          ...pick(i, attFields),
          id: i.id || `ATT-${Date.now()}`,
          userId: String(i.userId || ""),
          userName: i.userName || ""
        }));

        const c2 = await batchInsert(fullLeaveReq.slice(offset, offset + limit), (i) => reqModel.create({
          ...pick(i, leaveFields),
          id: i.id || `LR-${Date.now()}`
        }));

        const c3 = await batchInsert(fullLeaveRem.slice(offset, offset + limit), (i) => remModel.create({
          ...pick(i, remarkFields),
          id: i.id || `REM-${Date.now()}`
        }));
        
        count = Math.max(c1, c2, c3);
        break;
      }

      case "chat": {
        const { messageService } = await import("@/lib/chat-sheets");
        const fullData = await messageService.getAll() || [];
        const data = fullData.slice(offset, offset + limit);
        const model = getModel("ChatMessage");
        const fields = ["id", "sender_id", "receiver_id", "text", "type", "media_url", "read_by", "created_at"];
        count = await batchInsert(data, (item) =>
          model.create({
            ...pick(item, fields),
            id: item.id || `MSG-${Date.now()}`,
            created_at: item.created_at || timestamp
          })
        );
        break;
      }

      case "scot": {
        const data = await getScotData();
        const model = getModel("ScotRecord");
        const fields = ["id", "employeeName", "employeeNumber", "toName", "countryCode", "toNumber", "callType", "duration", "callDate", "callTime", "notes", "audioUrl"];
        count = await batchInsert(data.slice(offset, offset + limit), (item) => model.create(pick(item, fields)));
        break;
      }

      case "call": {
        const [fullCalls, fullFollowUps] = await Promise.all([
           getCallData(),
           getFollowUpData()
        ]);
        const model = getModel("CallRecord");
        const followModel = getModel("FollowUpRecord");

        const fields = ["id", "concernPerson", "mobileNum", "firmName", "district", "state", "region", "creditDaysNew", "limit", "collectionRating", "customerType", "salesPerson", "salesCoordinator", "averageOrderSize", "targetAvgOrderSize", "usuallyNoOfOrderMonthly", "frequencyOfCallingAfterOrderPlaced", "specialRemarkJSON"];
        const followFields = ["id", "partyName", "status", "nextFollowUpDate", "remarks", "createdBy", "createdAt", "lastFollowUpDate"];

        const c1 = await batchInsert(fullCalls.slice(offset, offset + limit), (item) => model.create(pick(item, fields)));
        const c2 = await batchInsert(fullFollowUps.slice(offset, offset + limit), (item) => followModel.create(pick(item, followFields)));
        count = c1 + c2;
        break;
      }

      case "scheduler": {
        console.log("Fetching Scheduler Meetings from Google Sheets...");
        const fullData = await getMeetings();
        const data = fullData.slice(offset, offset + limit);
        console.log(`Migrating ${data.length} meeting records (offset: ${offset})...`);
        const model = getModel("Meeting");
        const fields = ["id", "title", "start", "end", "allDay", "location", "description", "meeting_with", "created_at", "updated_at"];
        count = await batchInsert(data, (item) => {
          const payload = pick(item, fields);
          if (!payload.id) payload.id = `MEET-${Date.now()}-${Math.random()}`;
          return model.create(payload);
        });
        break;
      }

      case "user": {
        const [fullUsers, fullDropdown] = await Promise.all([getUsers(), getDropdownData()]);
        const userModel = getModel("User");
        const dropdownModel = getModel("Dropdown");
        
        const userFields = ["id", "username", "email", "password", "phone", "role_name", "late_long", "image_url", "dob", "office", "designation", "department", "last_active", "permissions"];
        const dropdownPayload = [
            ...(fullDropdown.departments || []).map((d: any) => ({ type: "department", value: d })),
            ...(fullDropdown.designations || []).map((d: any) => ({ type: "designation", value: d }))
        ];

        const c1 = await batchInsert(fullUsers.slice(offset, offset + limit), (item) => userModel.create(pick(item, userFields)));
        const c2 = await batchInsert(dropdownPayload.slice(offset, offset + limit), (item) => dropdownModel.create(item));
        count = Math.max(c1, c2);
        break;
      }

      case "help-ticket": {
        const [tickets, history] = await Promise.all([ getTickets(), ticketHistoryService.getAll() ]);
        const model = getModel("HelpTicket");
        const histModel = getModel("HelpTicketHistory");
        const fields = ["id", "title", "description", "category", "priority", "raised_by", "solver_person", "planned_resolution", "status", "attachment_url", "voice_note", "created_at", "updated_at"];
        const histFields = ["id", "ticket_id", "action_type", "actor_username", "old_status", "new_status", "comment_text", "attachment_url", "voice_note", "created_at"];
        const c1 = await batchInsert(tickets.slice(offset, offset + limit), (i) => model.create(pick(i, fields)));
        const c2 = await batchInsert(history.slice(offset, offset + limit), (i) => histModel.create(pick(i, histFields)));
        count = Math.max(c1, c2);
        break;
      }

      case "eamd": {
        const [fullWeekly, fullUrgent, fullAction, fullSync, fullTeam] = await Promise.all([
            getWeeklyUpdateItems(), getUrgentLogs(), getActionLogItems(), getSyncMeetings(), getTeamQueryItems()
        ]).catch(() => [[], [], [], [], []]);

        const wModel = getModel("EaMdWeeklyUpdate");
        const uModel = getModel("EaMdUrgentLog");
        const aModel = getModel("EaMdActionLog");
        const sModel = getModel("EaMdSyncMeeting");
        const tModel = getModel("EaMdTeamQuery");

        const wFields = ["id", "weekOf", "preparedBy", "periodCovered", "category", "description", "date", "teamMember", "timestamp"];
        const uFields = ["id", "issueSummary", "urgencyLevel", "channelUsed", "requiredFromMD", "deadline", "status"];
        const aFields = ["id", "task", "owner", "priority", "status", "due", "notes", "timestamp"];
        const sFields = ["id", "date", "time", "location", "agenda", "decisions", "actionItems", "notes", "timestamp"];
        const tFields = ["id", "teamMember", "query", "category", "eaResolve", "status", "eaNotes", "timestamp"];

        const c1 = await batchInsert(fullWeekly.slice(offset, offset + limit), (i) => wModel.create(pick(i, wFields)));
        const c2 = await batchInsert(fullUrgent.slice(offset, offset + limit), (i) => uModel.create(pick(i, uFields)));
        const c3 = await batchInsert(fullAction.slice(offset, offset + limit), (i) => aModel.create(pick(i, aFields)));
        const c4 = await batchInsert(fullSync.slice(offset, offset + limit), (i) => sModel.create({
            ...pick(i, sFields),
            agenda: typeof i.agenda === 'string' ? i.agenda : JSON.stringify(i.agenda || []),
            actionItems: typeof i.actionItems === 'string' ? i.actionItems : JSON.stringify(i.actionItems || [])
        }));
        const c5 = await batchInsert(fullTeam.slice(offset, offset + limit), (i) => tModel.create({
            ...pick(i, tFields),
            eaResolve: i.eaResolve?.toString() || ""
        }));

        count = Math.max(c1, c2, c3, c4, c5);
        break;
      }

      case "delegation": {
        const { getDelegations } = await import("@/lib/delegation-sheets");
        const fullDelegations = await getDelegations();
        const dels = (fullDelegations || []).slice(offset, offset + limit);
        const model = getModel("Delegation");
        const fields = ["id", "title", "description", "assigned_by", "assigned_to", "department", "priority", "due_date", "status", "voice_note_url", "reference_docs", "evidence_required", "created_at", "updated_at"];

        count = await batchInsert(dels, (item) => model.create({
            ...pick(item, fields),
            id: item.id || `DEL-${Date.now()}`,
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
