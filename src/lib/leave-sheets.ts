import { BaseSheetsService } from "./sheets/base-service";

const GOOGLE_SHEET_ID = "1Gl782jnYBytGTZ-vMj5CgppfJHUPRF6lcCdH-pmj5w8";
const LEAVE_SHEET = "Leave";
const REMARK_SHEET = "leave_remark";

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  responsibility1: string;
  responsibility2: string;
  responsibility3: string;
  acceptedBy: string;
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
  protected range = "A:L";
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): LeaveRequest {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] || "";
    return {
      id: get("id"),
      userId: get("userId"),
      userName: get("userName"),
      startDate: get("startDate"),
      endDate: get("endDate"),
      reason: get("reason"),
      status: get("status"),
      responsibility1: get("responsibility1"),
      responsibility2: get("responsibility2"),
      responsibility3: get("responsibility3"),
      acceptedBy: get("acceptedBy"),
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
    set("startDate", item.startDate);
    set("endDate", item.endDate);
    set("reason", item.reason);
    set("status", item.status);
    set("responsibility1", item.responsibility1);
    set("responsibility2", item.responsibility2);
    set("responsibility3", item.responsibility3);
    set("acceptedBy", item.acceptedBy);
    set("updatedAt", item.updatedAt);

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
