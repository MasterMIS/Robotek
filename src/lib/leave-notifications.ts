import { sendWhatsAppMessage } from "@/lib/maytapi";
import { getUsers } from "@/lib/google-sheets";
import { LeaveRequest } from "@/lib/leave-sheets";
import { getLeaveUrl } from "@/lib/app-url";

const HR_NUMBERS = ["9873441531", "8368998535"];  

export async function sendLeaveNotification(action: string, leave: LeaveRequest, extraData?: any) {
  try {
    const allUsers = await getUsers();
    const leaveUrl = leave?.id ? getLeaveUrl(leave.id) : null;

    // Helpers
    const getPhone = (idOrName: string) => {
      if (!idOrName) return null;
      const user = allUsers.find(u => String(u.id) === String(idOrName) || u.username === idOrName);
      return user?.phone || null;
    };

    const getName = (idOrName: string) => {
      if (!idOrName) return null;
      const user = allUsers.find(u => String(u.id) === String(idOrName) || u.username === idOrName);
      return user ? (user.username || user.id) : idOrName;
    };

    const formatDateForWhatsApp = (dateStr: string) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-GB', { month: 'short' });
      const year = d.getFullYear().toString().slice(2);
      return `${day} ${month} ${year}`;
    };

    const withErpLink = (customMsg: string) => {
      if (!leaveUrl) return customMsg;
      return `${customMsg}\n\n👉 *Open in ERP:*\n${leaveUrl}`;
    };

    const sendTo = async (phone: string | null, customMsg: string) => {
      if (phone) {
        await sendWhatsAppMessage(phone, withErpLink(customMsg)).catch(err => console.error(`WhatsApp error for ${phone}:`, err));
      }
    };

    const applicantName = leave.userName || "Unknown";
    const applicantPhone = getPhone(leave.userId) || getPhone(leave.userName);

    const dates = leave.leaveType === "Half Day"
      ? `on *${formatDateForWhatsApp(leave.startDate)}* for the *${leave.halfDaySession || 'Half Day'}*`
      : (leave.startDate === leave.endDate
        ? `on *${formatDateForWhatsApp(leave.startDate)}*`
        : `from *${formatDateForWhatsApp(leave.startDate)}* to *${formatDateForWhatsApp(leave.endDate)}*`);

    const respList = [
      { id: leave.responsibility1, name: getName(leave.responsibility1), phone: getPhone(leave.responsibility1), tasks: leave.tasks1 },
      { id: leave.responsibility2, name: getName(leave.responsibility2), phone: getPhone(leave.responsibility2), tasks: leave.tasks2 },
      { id: leave.responsibility3, name: getName(leave.responsibility3), phone: getPhone(leave.responsibility3), tasks: leave.tasks3 }
    ].filter(r => r.id);

    const involvedNames = respList.map(r => r.name).join(", ");

    let hrMsg = "";
    let applicantMsg = "";

    // ─── ACTION: CREATE ─────────────────────────────────────────────────────────────
    if (action === 'CREATE') {
      const header = "🆕 *New Leave Application*\n━━━━━━━━━━━━━━━━━\n";
      const common = `👤 *Applicant:* ${applicantName}\n📅 *Dates:* ${dates}\n🏷️ *Type:* ${leave.leaveType || "Full Day"}\n📋 *Reason:* _"${leave.reason || "N/A"}"_\n`;
      const coverage = involvedNames ? `\n👥 *Coverage By:* ${involvedNames}` : '';

      hrMsg = `${header}A new leave request has been submitted.\n\n${common}${coverage}`;
      applicantMsg = `${header}Hello ${applicantName},\nYour leave request has been successfully submitted and is currently *Pending*.\n\n${common}${coverage}`;

      for (const hr of HR_NUMBERS) await sendTo(hr, hrMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, applicantMsg);

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;
        let msg = `${header}Hello ${resp.name},\n👤 *${applicantName}* has requested leave ${dates}.\n\nYou have been selected to cover responsibilities during this time.`;
        if (leave.sharedTask) msg += `\n\n🔗 *Shared Task:* _"${leave.sharedTask}"_`;
        if (resp.tasks) msg += `\n🎯 *Your Specific Task:* _"${resp.tasks}"_`;
        msg += `\n\nPlease check the portal to review and accept this responsibility.`;
        await sendTo(resp.phone, msg);
      }
    }

    // ─── ACTION: ACCEPT_RESPONSIBILITY ──────────────────────────────────────────────
    else if (action === 'ACCEPT_RESPONSIBILITY') {
      const header = "🤝 *Leave Responsibility Accepted*\n━━━━━━━━━━━━━━━━━\n";
      const acceptorName = extraData?.acceptedBy || "Someone";

      hrMsg = `${header}👤 *${acceptorName}* has accepted the coverage responsibility for ${applicantName}'s leave ${dates}.`;
      applicantMsg = `${header}Good news, ${applicantName}!\n👤 *${acceptorName}* has accepted the responsibility to cover tasks during your leave ${dates}.`;

      for (const hr of HR_NUMBERS) await sendTo(hr, hrMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, applicantMsg);

      const isSharedTask = Boolean(leave.sharedTask && leave.sharedTask.trim());

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;

        let msg = "";
        if (resp.name === acceptorName || resp.id === extraData?.acceptedBy) {
          msg = `${header}Hello ${resp.name},\n✅ You have successfully accepted the responsibility to cover tasks for ${applicantName}'s leave ${dates}.`;
        } else {
          if (isSharedTask) {
            msg = `${header}Hello ${resp.name},\n👤 *${acceptorName}* has already accepted the shared responsibility for ${applicantName}'s leave ${dates}.\n\nYou do not need to take any further action on this.`;
          } else {
            msg = `${header}Hello ${resp.name},\n👤 *${acceptorName}* has accepted their specific responsibility for ${applicantName}'s leave.\n\nPlease remember to accept your assigned tasks as well if you haven't already.`;
          }
        }
        await sendTo(resp.phone, msg);
      }
    }

    // ─── ACTION: UPDATE_STATUS ──────────────────────────────────────────────────────
    else if (action === 'UPDATE_STATUS') {
      const header = `🔄 *Leave Status Updated*\n━━━━━━━━━━━━━━━━━\n`;
      const status = extraData?.status || leave.status;

      hrMsg = `${header}The leave request for 👤 *${applicantName}* ${dates} has been marked as *${status}*.`;
      applicantMsg = `${header}Hello ${applicantName},\nYour leave request ${dates} has been marked as *${status}*.`;

      for (const hr of HR_NUMBERS) await sendTo(hr, hrMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, applicantMsg);

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;
        const msg = `${header}Hello ${resp.name},\nThe leave request for 👤 *${applicantName}*, for which you are providing coverage, has been marked as *${status}*.`;
        await sendTo(resp.phone, msg);
      }
    }

    // ─── ACTION: ADD_REMARK ─────────────────────────────────────────────────────────
    else if (action === 'ADD_REMARK') {
      const header = `💬 *New Remark on Leave*\n━━━━━━━━━━━━━━━━━\n`;
      const comment = extraData?.comment || "";

      const commonMsg = `${header}A new remark was added to the leave request of 👤 *${applicantName}* ${dates}.\n\n💬 *Remark:* _"${comment}"_`;

      for (const hr of HR_NUMBERS) await sendTo(hr, commonMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, commonMsg);

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;
        await sendTo(resp.phone, commonMsg);
      }
    }

    // ─── ACTION: UPDATE ─────────────────────────────────────────────────────────────
    else if (action === 'UPDATE') {
      const header = `📝 *Leave Application Updated*\n━━━━━━━━━━━━━━━━━\n`;
      hrMsg = `${header}👤 *${applicantName}* has updated the details of their leave request ${dates}.`;
      applicantMsg = `${header}Hello ${applicantName},\nYou have successfully updated your leave request ${dates}.`;

      for (const hr of HR_NUMBERS) await sendTo(hr, hrMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, applicantMsg);

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;
        const msg = `${header}Hello ${resp.name},\n👤 *${applicantName}* has updated their leave request details.\n\nPlease review the portal to see if your coverage tasks have changed.`;
        await sendTo(resp.phone, msg);
      }
    }

    // ─── ACTION: DELETE ─────────────────────────────────────────────────────────────
    else if (action === 'DELETE') {
      const header = `🗑️ *Leave Application Cancelled*\n━━━━━━━━━━━━━━━━━\n`;
      hrMsg = `${header}👤 *${applicantName}* has cancelled their leave request ${dates}.`;
      applicantMsg = `${header}Hello ${applicantName},\nYou have successfully cancelled your leave request ${dates}.`;

      for (const hr of HR_NUMBERS) await sendTo(hr, hrMsg);
      if (applicantPhone && !HR_NUMBERS.includes(applicantPhone)) await sendTo(applicantPhone, applicantMsg);

      for (const resp of respList) {
        if (!resp.phone || HR_NUMBERS.includes(resp.phone) || resp.phone === applicantPhone) continue;
        const msg = `${header}Hello ${resp.name},\n👤 *${applicantName}* has cancelled their leave request.\n\nYou no longer need to provide coverage for this request.`;
        await sendTo(resp.phone, msg);
      }
    }

  } catch (error) {
    console.error("Error in sendLeaveNotification:", error);
  }
}
