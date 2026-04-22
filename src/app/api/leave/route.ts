import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate, formatDateMMM } from "@/lib/dateUtils";
import { getUsers } from "@/lib/google-sheets";
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '@/../amplify_outputs.json';
import type { Schema } from '@/../amplify/data/resource';

Amplify.configure(outputs);
const client = generateClient<Schema>({ authMode: 'apiKey' });

// Helper to fetch all records from AWS (handling pagination)
async function fetchAWSData<T>(model: { list: (options: any) => Promise<{ data: T[]; nextToken?: string | null }> }) {
  let allRecords: T[] = [];
  let nextToken: string | null | undefined = undefined;
  do {
    const response = await model.list({ nextToken, limit: 1000 });
    allRecords = [...allRecords, ...response.data];
    nextToken = response.nextToken;
  } while (nextToken);
  return allRecords;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const leaveId = searchParams.get('leaveId');

    if (type === 'remarks' && leaveId) {
      const allRemarks = await fetchAWSData(client.models.LeaveRemark);
      const remarks = allRemarks.filter(r => r.leaveId === leaveId);
      return NextResponse.json({ remarks });
    }

    const allLeaves = await fetchAWSData(client.models.LeaveRequest);
    let leaves = allLeaves;

    if (role !== 'Admin' && userId) {
      leaves = allLeaves.filter((l: any) => 
        String(l.userId) === String(userId) || 
        String(l.responsibility1) === String(userId) ||
        String(l.responsibility2) === String(userId) ||
        String(l.responsibility3) === String(userId)
      );
    }

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error("GET Leave Error:", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { action, userId, userName, leaveId, status, comment, responsibility1, responsibility2, responsibility3, acceptedBy } = data;

    const allUsers = await getUsers();
    const getUserPhone = (id: string) => allUsers.find(u => String(u.id) === String(id))?.phone;

    if (action === 'UPDATE_STATUS') {
      if (!leaveId || !status) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      const { data: updated, errors } = await client.models.LeaveRequest.update({ id: leaveId, status });
      if (errors) throw new Error(errors[0].message);
      
      // Notify Applicant
      const lv = updated;
      if (lv) {
        const applicantPhone = getUserPhone(lv.userId || "");
        if (applicantPhone) {
          const message = `🔄 *Leave Status Changed*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Period:* ${formatDateMMM(lv.startDate || "")} to ${formatDateMMM(lv.endDate || "")}\n🏷️ *New Status:* *${status}*\n\n_System generated notification_`;
          await sendWhatsAppMessage(applicantPhone, message);
        }
      }
      return NextResponse.json({ success: true });

    } else if (action === 'ACCEPT_RESPONSIBILITY') {
        if (!leaveId || !acceptedBy) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const { data: updated, errors } = await client.models.LeaveRequest.update({ id: leaveId, status: "Pending", acceptedBy });
        if (errors) throw new Error(errors[0].message);
        
        // Notify Applicant
        const lv = updated;
        if (lv) {
            const applicantPhone = getUserPhone(lv.userId || "");
            if (applicantPhone) {
                const message = `✅ *Responsibility Accepted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n🤝 *Accepted By:* ${acceptedBy}\n📅 *Leave Period:* ${formatDateMMM(lv.startDate || "")} to ${formatDateMMM(lv.endDate || "")}\n\n_The colleague has confirmed they will handle your work._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }
        return NextResponse.json({ success: true });

    } else if (action === 'ADD_REMARK') {
      if (!leaveId || !comment) return NextResponse.json({ error: "Missing data" }, { status: 400 });
      const newRemark = {
        id: `REM-${Date.now()}`,
        leaveId,
        userName: userName || "Unknown",
        comment,
        createdAt: new Date().toISOString()
      };
      const { errors: remarkErrors } = await client.models.LeaveRemark.create(newRemark);
      if (remarkErrors) throw new Error(remarkErrors[0].message);

      const { data: lv, errors: lvErrors } = await client.models.LeaveRequest.get({ id: leaveId });
      if (lvErrors || !lv) return NextResponse.json({ success: true });

      const template = `💬 *New Remark Added*\n━━━━━━━━━━━━━━━━━\n👤 *By:* ${userName}\n📝 *Comment:* ${comment}\n📄 *Ref Leave:* ${formatDateMMM(lv.startDate || "")} - ${formatDateMMM(lv.endDate || "")}\n\n_Please check your dashboard for details._`;

      if (lv.userName !== userName) {
          const applicantPhone = getUserPhone(lv.userId || "");
          if (applicantPhone) {
              await sendWhatsAppMessage(applicantPhone, template);
          }
      } else {
          const phones = [lv.responsibility1, lv.responsibility2, lv.responsibility3]
            .filter(Boolean)
            .map(id => getUserPhone(id!))
            .filter(Boolean);
          
          for (const phone of phones) {
            await sendWhatsAppMessage(phone!, template);
          }
      }
      return NextResponse.json({ success: true });

    } else {
      // Create new leave request
      const { startDate, endDate, reason } = data;
      if (!userId || !startDate || !endDate || !reason) return NextResponse.json({ error: "Missing data" }, { status: 400 });

      const newLeave = {
        id: `LV-${Date.now()}`,
        userId: String(userId),
        userName: userName || "Unknown",
        startDate,
        endDate,
        reason,
        status: "Pending",
        responsibility1: responsibility1 || "",
        responsibility2: responsibility2 || "",
        responsibility3: responsibility3 || "",
        updatedAt: new Date().toISOString()
      };

      const { data: created, errors } = await client.models.LeaveRequest.create(newLeave);
      if (errors) throw new Error(errors[0].message);

      const getRName = (id?: string) => id ? allUsers.find(u => String(u.id) === String(id))?.username || id : '';
      const rNames = [responsibility1, responsibility2, responsibility3].filter(Boolean).map(getRName).join(', ');

      // Notify Applicant
      const applicantPhone = getUserPhone(userId);
      if (applicantPhone) {
        const message = `🔔 *Leave Application Submitted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${userName}\n📅 *From:* ${formatDateMMM(startDate)}\n📅 *To:* ${formatDateMMM(endDate)}\n📝 *Reason:* ${reason}\n👥 *Responsibilities:* ${rNames || 'None'}\n\n_Your request is now pending review._`;
        await sendWhatsAppMessage(applicantPhone, message);
      }

      // Notify Responsibility selected
      const responsibilityIds = [responsibility1, responsibility2, responsibility3].filter(Boolean);
      for (const rId of responsibilityIds) {
          const rPhone = getUserPhone(rId!);
          if (rPhone) {
              const message = `📋 *New Responsibility Assigned*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${userName}\n📅 *From:* ${formatDateMMM(startDate)}\n📅 *To:* ${formatDateMMM(endDate)}\n🤝 *Your Role:* Responsibility Person\n\n_You have been marked to handle the work in their absence._`;
              await sendWhatsAppMessage(rPhone, message);
          }
      }

      return NextResponse.json({ success: true, leave: created });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
    try {
        const data = await req.json();
        const { leaveId, ...updates } = data;
        if (!leaveId) return NextResponse.json({ error: "Missing leaveId" }, { status: 400 });

        const { data: updated, errors } = await client.models.LeaveRequest.update({ id: leaveId, ...updates });
        if (errors) throw new Error(errors[0].message);

        // Notify Applicant
        const lv = updated;
        if (lv) {
            const allUsers = await getUsers();
            const applicantPhone = allUsers.find(u => String(u.id) === String(lv.userId))?.phone;
            if (applicantPhone) {
                const message = `📝 *Leave Request Updated*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Updated To:* ${formatDateMMM(lv.startDate || "")} - ${formatDateMMM(lv.endDate || "")}\n📝 *Reason:* ${lv.reason}\n\n_Please check the dashboard for the latest details._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const leaveId = searchParams.get('leaveId');
        if (!leaveId) return NextResponse.json({ error: "Missing leaveId" }, { status: 400 });

        // Get info before deleting for notification
        const { data: lv, errors: getErrors } = await client.models.LeaveRequest.get({ id: leaveId });
        if (getErrors) throw new Error(getErrors[0].message);

        const { errors: delErrors } = await client.models.LeaveRequest.delete({ id: leaveId });
        if (delErrors) throw new Error(delErrors[0].message);

        // Delete associated remarks
        const allRemarks = await fetchAWSData(client.models.LeaveRemark);
        const targetRemarks = allRemarks.filter(r => r.leaveId === leaveId);
        for (const rem of targetRemarks) {
            await client.models.LeaveRemark.delete({ id: rem.id });
        }

        if (lv) {
            const allUsers = await getUsers();
            const applicantPhone = allUsers.find(u => String(u.id) === String(lv.userId))?.phone;
            if (applicantPhone) {
                const message = `🗑️ *Leave Request Deleted*\n━━━━━━━━━━━━━━━━━\n👤 *Applicant:* ${lv.userName}\n📅 *Was For:* ${formatDateMMM(lv.startDate || "")}\n\n_This leave request has been removed from the system._`;
                await sendWhatsAppMessage(applicantPhone, message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
    }
}
