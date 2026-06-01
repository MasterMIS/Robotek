import { BaseSheetsService } from "./sheets/base-service";
import { AssetItem } from "@/types/asset";

// Use a fallback generic Sheet ID if not provided, or reuse an existing generic one.
const GOOGLE_SHEET_ID = process.env.ASSET_SHEET_ID || "1vaXABZWloZPWqSJcPLUXOrCfPAZtDMmRzOj9r6myB78";
const SHEET_NAME = "Assets";

class AssetService extends BaseSheetsService<AssetItem> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SHEET_NAME;
  protected range = "A:K";
  protected idColumnIndex = 0;

  private readonly CANONICAL_HEADERS = [
    "ID", "Asset ID", "Category", "Asset Name", "Assigned To",
    "Status", "Serial Number", "Purchase Date", "Remarks", "Location", "Updated At"
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): AssetItem {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";

    return {
      id: get("id"),
      asset_id: get("asset id"),
      category: get("category"),
      asset_name: get("asset name"),
      assigned_to: get("assigned to"),
      status: (get("status") as AssetItem["status"]) || "Available",
      serial_number: get("serial number"),
      purchase_date: get("purchase date"),
      remarks: get("remarks"),
      location: get("location"),
      updated_at: get("updated at"),
    };
  }

  mapItemToRow(item: AssetItem): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("asset id", item.asset_id);
    set("category", item.category);
    set("asset name", item.asset_name);
    set("assigned to", item.assigned_to);
    set("status", item.status);
    set("serial number", item.serial_number);
    set("purchase date", item.purchase_date);
    set("remarks", item.remarks);
    set("location", item.location);
    set("updated at", item.updated_at || new Date().toISOString());

    return row;
  }

  public getCanonicalHeaders() {
    return this.CANONICAL_HEADERS;
  }
}

export const assetService = new AssetService();

export async function getAssets(): Promise<AssetItem[]> {
  return assetService.getAll();
}

export async function addAsset(data: Partial<AssetItem>): Promise<boolean> {
  if (!data.id) data.id = Date.now().toString();
  await assetService.ensureColumns(assetService.getCanonicalHeaders());
  return assetService.add(data as AssetItem);
}

export async function updateAsset(id: string, data: AssetItem): Promise<boolean> {
  await assetService.ensureColumns(assetService.getCanonicalHeaders());
  return assetService.update(id, data);
}

export async function deleteAsset(id: string): Promise<boolean> {
  return assetService.delete(id);
}
