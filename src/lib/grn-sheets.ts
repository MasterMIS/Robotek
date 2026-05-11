import { BaseSheetsService } from "./sheets/base-service";
import { GRN } from "@/types/grn";
import { globalCache } from "./cache";

const GOOGLE_SHEET_ID = "170_kSzQKoO5N7euODaLz1kaJVXN7QRlRqHdnBn0kdos";
const SHEET_NAME = "GRN";

class GRNService extends BaseSheetsService<GRN> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:Z"; // Flexible range
  protected idColumnIndex = 0;

  mapRowToItem(row: any[]): GRN {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    return {
      id: get("id"),
      GRN_No: get("grn_no"),
      PO_Number: get("po_number"),
      Item_Name: get("item_name"),
      Category: get("category"),
      Qty: get("qty"),
      Country: get("country"),
      Attach_Bill: get("attach_bill"),
      Payment_Terms_In_days: get("payment_terms_(in_days)") || get("payment_terms_in_days"),
      Payment_Completed: get("payment_completed"),
      filled_by: get("filled_by"),
      updated_at: get("updated_at"),
      indent_id: get("indent_id"),
    };
  }

  mapItemToRow(item: GRN): any[] {
    const totalCols = Math.max(...Object.values(this.hMap)) + 1 || 12;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("grn_no", item.GRN_No);
    set("po_number", item.PO_Number);
    set("item_name", item.Item_Name);
    set("category", item.Category);
    set("qty", item.Qty);
    set("country", item.Country);
    set("attach_bill", item.Attach_Bill);
    set("payment_terms_(in_days)", item.Payment_Terms_In_days);
    set("payment_completed", item.Payment_Completed);
    set("filled_by", item.filled_by);
    set("updated_at", item.updated_at);
    set("indent_id", item.indent_id);

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }

  async getNextGRNNum(): Promise<string> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const colIdx = this.hMap["grn_no"];
      if (colIdx === undefined) return "GRN-1";

      const letter = this.getColLetter(colIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${letter}:${letter}`,
      });

      const values = response.data.values?.slice(1) || [];
      let maxNum = 0;
      for (const row of values) {
        const val = String(row[0] || "");
        const match = val.match(/GRN-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `GRN-${maxNum + 1}`;
    } catch (error) {
      console.error("Error generating GRN num:", error);
      return "GRN-1";
    }
  }

  async getNextPOSuffix(basePONumber: string): Promise<string> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const colIdx = this.hMap["po_number"];
      if (colIdx === undefined) return `${basePONumber}_1`;

      const letter = this.getColLetter(colIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${letter}:${letter}`,
      });

      const values = response.data.values?.slice(1) || [];
      let maxSuffix = 0;
      const regex = new RegExp(`^${basePONumber}_(\\d+)$`, 'i');
      
      for (const row of values) {
        const val = String(row[0] || "");
        const match = val.match(regex);
        if (match) {
          const suffix = parseInt(match[1]);
          if (suffix > maxSuffix) maxSuffix = suffix;
        }
      }
      return `${basePONumber}_${maxSuffix + 1}`;
    } catch (error) {
      console.error("Error generating PO suffix:", error);
      return `${basePONumber}_1`;
    }
  }

  private getColLetter(colIndex: number): string {
    let temp, letter = "";
    let col = colIndex + 1;
    while (col > 0) {
      temp = (col - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = Math.floor((col - temp - 1) / 26);
    }
    return letter;
  }
}

export const grnService = new GRNService();

export async function addGRNEntry(data: Partial<GRN>): Promise<string> {
  if (!data.id) {
    data.id = (await grnService.getNextNumericalId()).toString();
  }
  if (!data.GRN_No) {
    data.GRN_No = await grnService.getNextGRNNum();
  }
  
  // Handle PO suffixing if PO_Number is provided
  if (data.PO_Number && !data.PO_Number.includes('_')) {
    data.PO_Number = await grnService.getNextPOSuffix(data.PO_Number);
  }

  const now = new Date().toISOString();
  data.updated_at = now;

  // Ensure columns exist
  await grnService.ensureColumns(["id", "GRN_No", "PO_Number", "Item_Name", "Category", "Qty", "Country", "Attach_Bill", "Payment_Terms_(In_days)", "Payment_Completed", "filled_by", "updated_at", "indent_id"]);

  const success = await grnService.add(data as GRN);
  return success ? data.PO_Number! : "";
}

export async function getGRNItems(): Promise<GRN[]> {
  return grnService.getAll();
}
