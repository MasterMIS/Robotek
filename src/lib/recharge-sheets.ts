import { BaseSheetsService } from "./sheets/base-service";
import { RechargeItem } from "@/types/recharge";

const GOOGLE_SHEET_ID = "1-j19ZWmWJKr43riOZYEcdV0LjQTlVXDyUqfC1H2LjPY";
const SHEET_NAME = "Recharge";

class RechargeService extends BaseSheetsService<RechargeItem> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:I";
  protected idColumnIndex = 0; // "ID" column or we map it to Timestamp

  private readonly CANONICAL_HEADERS = [
    "ID", "Timestamp", "Filled By", "Doer/Wifi Name", "Phone/Wifi Num",
    "Date of Recharge", "Validity", "Amount", "Attach Bill", "Type"
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): RechargeItem {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";

    // The user sheet might not have "ID" explicitly mentioned but I added it for CRUD.
    // Let's use Timestamp as the ID if ID column is not present.
    const timestamp = get("timestamp");
    const id = get("id") || timestamp;

    return {
      id,
      timestamp,
      filled_by: get("filled by"),
      doer_wifi_name: get("doer/wifi name"),
      phone_wifi_num: get("phone/wifi num"),
      date_of_recharge: get("date of recharge"),
      validity: get("validity"),
      amount: get("amount"),
      attach_bill: get("attach bill"),
      type: (get("type") as RechargeItem["type"]) || "Recharge",
    };
  }

  mapItemToRow(item: RechargeItem): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("timestamp", item.timestamp);
    set("filled by", item.filled_by);
    set("doer/wifi name", item.doer_wifi_name);
    set("phone/wifi num", item.phone_wifi_num);
    set("date of recharge", item.date_of_recharge);
    set("validity", item.validity);
    set("amount", item.amount);
    set("attach bill", item.attach_bill);
    set("type", item.type);

    return row;
  }

  public getCanonicalHeaders() {
    return this.CANONICAL_HEADERS;
  }
}

export const rechargeService = new RechargeService();

export async function getRecharges(): Promise<RechargeItem[]> {
  return rechargeService.getAll();
}

export async function addRecharge(data: Partial<RechargeItem>): Promise<boolean> {
  if (!data.id) data.id = Date.now().toString();
  if (!data.timestamp) data.timestamp = new Date().toISOString();
  await rechargeService.ensureColumns(rechargeService.getCanonicalHeaders());
  return rechargeService.add(data as RechargeItem);
}

export async function updateRecharge(id: string, data: RechargeItem): Promise<boolean> {
  await rechargeService.ensureColumns(rechargeService.getCanonicalHeaders());
  return rechargeService.update(id, data);
}

export async function deleteRecharge(id: string): Promise<boolean> {
  return rechargeService.delete(id);
}
