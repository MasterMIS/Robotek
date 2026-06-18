import { BaseSheetsService } from "./sheets/base-service";

const GOOGLE_SHEET_ID = "1Gl782jnYBytGTZ-vMj5CgppfJHUPRF6lcCdH-pmj5w8";
const LEAVE_SHEET = "Leave";
const REMARK_SHEET = "leave_remark";

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  leaveType: string;          // "Full Day" | "Half Day"
  halfDaySession: string;     // "First Half" | "Second Half" (only when Half Day)
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  responsibility1: string;
  responsibility2: string;
  responsibility3: string;
  tasks1: string;             // tasks for responsibility1 person
  tasks2: string;             // tasks for responsibility2 person
  tasks3: string;             // tasks for responsibility3 person
  sharedTask: string;         // common task shared with whoever accepts
  acceptedBy: string;
  acceptedBy1?: string;
  acceptedAt1?: string;
  acceptedBy2?: string;
  acceptedAt2?: string;
  acceptedBy3?: string;
  acceptedAt3?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface LeaveRemark {
  id: string;
  leaveId: string;
  userName: string;
  comment: string;
  createdAt: string;
}

class LeaveRequestService extends BaseSheetsService<LeaveRequest> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = LEAVE_SHEET;
  protected range = "A:Z";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): LeaveRequest {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      userId: get("userId"),
      userName: get("userName"),
      leaveType: get("leaveType") || "Full Day",
      halfDaySession: get("halfDaySession") || "",
      startDate: get("startDate"),
      endDate: get("endDate"),
      reason: get("reason"),
      status: get("status"),
      responsibility1: get("responsibility1"),
      responsibility2: get("responsibility2"),
      responsibility3: get("responsibility3"),
      tasks1: get("tasks1"),
      tasks2: get("tasks2"),
      tasks3: get("tasks3"),
      sharedTask: get("sharedTask") || "",
      acceptedBy: get("acceptedBy"),
      acceptedBy1: get("acceptedBy1"),
      acceptedAt1: get("acceptedAt1"),
      acceptedBy2: get("acceptedBy2"),
      acceptedAt2: get("acceptedAt2"),
      acceptedBy3: get("acceptedBy3"),
      acceptedAt3: get("acceptedAt3"),
      createdAt: get("createdAt"),
      updatedAt: get("updatedAt"),
    };
  }

  mapItemToRow(item: LeaveRequest): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };
    set("id", item.id);
    set("userId", item.userId);
    set("userName", item.userName);
    set("leaveType", item.leaveType || "Full Day");
    set("halfDaySession", item.halfDaySession || "");
    set("startDate", item.startDate);
    set("endDate", item.endDate);
    set("reason", item.reason);
    set("status", item.status);
    set("responsibility1", item.responsibility1);
    set("responsibility2", item.responsibility2);
    set("responsibility3", item.responsibility3);
    set("tasks1", item.tasks1 || "");
    set("tasks2", item.tasks2 || "");
    set("tasks3", item.tasks3 || "");
    set("sharedTask", item.sharedTask || "");
    set("acceptedBy", item.acceptedBy || "");
    set("acceptedBy1", (item as any).acceptedBy1 || "");
    set("acceptedAt1", (item as any).acceptedAt1 || "");
    set("acceptedBy2", (item as any).acceptedBy2 || "");
    set("acceptedAt2", (item as any).acceptedAt2 || "");
    set("acceptedBy3", (item as any).acceptedBy3 || "");
    set("acceptedAt3", (item as any).acceptedAt3 || "");
    set("createdAt", (item as any).createdAt || "");
    set("updatedAt", item.updatedAt || "");

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

class LeaveRemarkService extends BaseSheetsService<LeaveRemark> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = REMARK_SHEET;
  protected range = "A:E";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): LeaveRemark {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      leaveId: get("leaveId"),
      userName: get("userName"),
      comment: get("comment"),
      createdAt: get("createdAt"),
    };
  }

  mapItemToRow(item: LeaveRemark): any[] {
    const row: any[] = [];
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val;
    };
    set("id", item.id);
    set("leaveId", item.leaveId);
    set("userName", item.userName);
    set("comment", item.comment);
    set("createdAt", item.createdAt);

    const maxIdx = Math.max(...Object.values(this.hMap), 0);
    for (let i = 0; i <= maxIdx; i++) {
        if (row[i] === undefined) row[i] = "";
    }
    return row;
  }
}

export const leaveRequestService = new LeaveRequestService();
export const leaveRemarkService = new LeaveRemarkService();
