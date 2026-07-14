import { BaseSheetsService } from "./sheets/base-service";
import { PaymentVendorRecord } from "@/types/payment-vendor";

const GOOGLE_SHEET_ID = "170_kSzQKoO5N7euODaLz1kaJVXN7QRlRqHdnBn0kdos"; // GRN Spreadsheet ID
const SHEET_NAME = "Payment Vendor Approval";

class PaymentVendorService extends BaseSheetsService<PaymentVendorRecord> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:C";
  protected idColumnIndex = 0; // Using GRN No as the unique identifier conceptually, but we map it

  mapRowToItem(row: any[]): PaymentVendorRecord {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const grn_no = get("grn_no") || get("grn no") || row[0] || "";
    return {
      id: grn_no, // BaseSheetsService requires 'id'. We map grn_no to id.
      grn_no: grn_no,
      status: get("status") || row[1] || "",
      remarks: get("remarks") || row[2] || "",
    };
  }

  mapItemToRow(item: PaymentVendorRecord): any[] {
    const totalCols = Math.max(...Object.values(this.hMap)) + 1 || 3;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      let idx = this.hMap[h.toLowerCase()];
      if (idx === undefined) {
        if (h.toLowerCase() === 'grn_no' || h.toLowerCase() === 'grn no') idx = 0;
        else if (h.toLowerCase() === 'status') idx = 1;
        else if (h.toLowerCase() === 'remarks') idx = 2;
      }
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("grn no", item.grn_no);
    set("status", item.status);
    set("remarks", item.remarks);

    return row;
  }

  // Override to find row by grn_no instead of id
  async updateByGrnNo(grn_no: string, updates: Partial<PaymentVendorRecord>): Promise<boolean> {
    try {
      const sheets = await this.getSheetsClient();
      await this.ensureHeaders();

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:A`, // Assuming GRN No is in column A
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === grn_no);

      if (rowIndex === -1) {
        // Not found, so we create it
        const newItem: PaymentVendorRecord = {
          id: grn_no,
          grn_no,
          status: updates.status || "",
          remarks: updates.remarks || "",
        };
        return await this.add(newItem);
      }

      // Found, so we update it
      const rowToUpdate = rowIndex + 1; // 1-based index
      const itemRow = this.mapItemToRow({ id: grn_no, grn_no, ...updates } as PaymentVendorRecord);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A${rowToUpdate}:C${rowToUpdate}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [itemRow.slice(0, 3)],
        },
      });

      return true;
    } catch (error) {
      console.error("Error updating by GRN No:", error);
      return false;
    }
  }
}

export const paymentVendorService = new PaymentVendorService();

export async function getPaymentVendorRecords(): Promise<PaymentVendorRecord[]> {
  await paymentVendorService.ensureColumns(["GRN No", "Status", "Remarks"]);
  return paymentVendorService.getAll();
}

export async function updatePaymentVendorRecord(grn_no: string, updates: Partial<PaymentVendorRecord>): Promise<boolean> {
  await paymentVendorService.ensureColumns(["GRN No", "Status", "Remarks"]);
  return paymentVendorService.updateByGrnNo(grn_no, updates);
}
