import { NextRequest, NextResponse } from "next/server";
import { getChecklists, addChecklist, addChecklists, getChecklistsPaginated } from "@/lib/checklist-sheets";
import { getUserByUsernameOrEmail } from "@/lib/google-sheets";
import { Checklist } from "@/types/checklist";
import { sendWhatsAppMessage } from "@/lib/maytapi";
import { formatDate } from "@/lib/dateUtils";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const statusFiltersStr = searchParams.get('statusFilters') || '[]';
  const assignmentFilter = searchParams.get('assignmentFilter') || 'All';
  const currentUser = searchParams.get('currentUser') || '';
  const userRole = searchParams.get('userRole') || 'USER';
  const dateFiltersStr = searchParams.get('dateFilters') || '[]';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const modalStatusStr = searchParams.get('modalStatus') || '[]';
  const modalPriorityStr = searchParams.get('modalPriority') || '[]';
  const modalAssignedToStr = searchParams.get('modalAssignedTo') || '[]';
  const modalAssignedByStr = searchParams.get('modalAssignedBy') || '[]';
  const modalDepartmentStr = searchParams.get('modalDepartment') || '[]';
  const modalFrequencyStr = searchParams.get('modalFrequency') || '[]';
  const sortKey = searchParams.get('sortKey') || 'id';
  const sortDir = searchParams.get('sortDir') || 'desc';

  // If no pagination params provided, return all (legacy fallback)
  if (!searchParams.has('page') && !searchParams.has('limit')) {
    const checklists = await getChecklists();
    return NextResponse.json(checklists);
  }

  try {
    const statusFilters = JSON.parse(statusFiltersStr);
    const dateFilters = JSON.parse(dateFiltersStr);
    const modalStatus = JSON.parse(modalStatusStr);
    const modalPriority = JSON.parse(modalPriorityStr);
    const modalAssignedTo = JSON.parse(modalAssignedToStr);
    const modalAssignedBy = JSON.parse(modalAssignedByStr);
    const modalDepartment = JSON.parse(modalDepartmentStr);
    const modalFrequency = JSON.parse(modalFrequencyStr);

    const result = await getChecklistsPaginated(
      page, limit, search,
      statusFilters, assignmentFilter, currentUser, userRole,
      dateFilters, startDate, endDate,
      modalStatus, modalPriority, modalAssignedTo, modalAssignedBy, modalDepartment, modalFrequency,
      sortKey, sortDir
    );

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' },
    });
  } catch (error) {
    console.error('Checklist pagination error:', error);
    return NextResponse.json({ error: 'Pagination failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isBulk = Array.isArray(body);
    const items = isBulk ? body : [body];

    const success = isBulk ? await addChecklists(items) : await addChecklist(items[0]);

    if (success) {
      // Send WhatsApp Notifications (Background)
      Promise.all(items.map(async (item: Checklist) => {
        try {
          const assignedUser = await getUserByUsernameOrEmail(item.assigned_to || "");
          if (assignedUser && assignedUser.phone) {
            const formattedDueDate = formatDate(item.due_date || "");
            const message = `🔔 *New Checklist Assigned*\n━━━━━━━━━━━━━━━━━\n📌 *Task:* ${item.task}\n🎯 *Priority:* ${item.priority}\n🏢 *Department:* ${item.department}\n⏳ *Due Date:* ${formattedDueDate}\n👨‍💼 *Assigned By:* ${item.assigned_by}`;
            await sendWhatsAppMessage(assignedUser.phone, message);
          }
        } catch (err) {
          console.error("Error sending WhatsApp notification:", err);
        }
      })).catch(e => console.error("Bulk WhatsApp error:", e));

      return NextResponse.json({ message: isBulk ? "Checklists added successfully" : "Checklist added successfully" });
    } else {
      return NextResponse.json({ error: "Failed to add checklist(s)" }, { status: 500 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
