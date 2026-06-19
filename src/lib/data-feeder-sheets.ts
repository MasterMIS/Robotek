import { BaseSheetsService } from "./sheets/base-service";
import { DataFeeder } from "@/types/data-feeder";

const GOOGLE_SHEET_ID = "1IhvpIYKBojl3hn0SdV-gMp79ehNg5p4Ggp_Znjfzc-I";
const SHEET_NAME = "Data Feeder";

class DataFeederService extends BaseSheetsService<DataFeeder> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:L"; // ID + 9 fields + timestamp + updated_at
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): DataFeeder {
    return {
      id: row[0] || "",
      employeeName: row[1] || "",
      employeeNumber: row[2] || "",
      toName: row[3] || "",
      countryCode: row[4] || "",
      toNumber: row[5] || "",
      callType: row[6] || "",
      duration: row[7] || "",
      callDate: row[8] || "",
      callTime: row[9] || "",
      timestamp: row[10] || "",
      updated_at: row[11] || "",
    };
  }

  mapItemToRow(p: DataFeeder): any[] {
    const row: any[] = new Array(12).fill("");
    row[0] = p.id || Date.now().toString();
    row[1] = p.employeeName || "";
    row[2] = p.employeeNumber || "";
    row[3] = p.toName || "";
    row[4] = p.countryCode || "";
    row[5] = p.toNumber || "";
    row[6] = p.callType || "";
    row[7] = p.duration || "";
    row[8] = p.callDate || "";
    row[9] = p.callTime || "";
    row[10] = p.timestamp || new Date().toISOString();
    row[11] = p.updated_at || new Date().toISOString();
    return row;
  }
}

export const dataFeederService = new DataFeederService();

export async function getDataFeeder(): Promise<DataFeeder[]> {
  return dataFeederService.getAll();
}

export async function addDataFeeder(item: DataFeeder): Promise<boolean> {
  return dataFeederService.add(item);
}

export async function addManyDataFeeder(items: DataFeeder[]): Promise<boolean> {
  return dataFeederService.addMany(items);
}

export async function updateDataFeeder(id: string, item: DataFeeder): Promise<boolean> {
  return dataFeederService.update(id, item);
}

export async function deleteDataFeeder(id: string): Promise<boolean> {
  return dataFeederService.delete(id);
}
