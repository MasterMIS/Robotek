import { BaseSheetsService } from "./sheets/base-service";
import { StationaryItem, StationaryLog } from "@/types/stationary";

// Provide a default sheet ID or read from env.
const GOOGLE_SHEET_ID = process.env.STATIONARY_SHEET_ID || "1g1HhC9G7mT-FVTVnC5wVstjl9m63ZHNMbtnkkIJ_7xI";
const MASTER_SHEET_NAME = "Master";
const LOGS_SHEET_NAME = "IN/Out Entries";

class StationaryMasterService extends BaseSheetsService<StationaryItem> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = MASTER_SHEET_NAME;
  protected range = "A:L";
  protected idColumnIndex = 0;

  private readonly CANONICAL_HEADERS = [
    "SKU Code", "Category", "ITEM NAME", "MOQ", "Avg Daily Consumption", 
    "Material In Transit", "From/Seller", "Lead Time (I2R)", "Safety Factor", 
    "Max Level", "Total Available"
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): StationaryItem {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    
    const maxLevel = parseFloat(get("max level")) || 0;
    const totalAvailable = parseFloat(get("total available")) || 0;

    return {
      id: get("sku code"), // using SKU Code as ID
      sku_code: get("sku code"),
      category: get("category"),
      item_name: get("item name"),
      moq: parseFloat(get("moq")) || 0,
      avg_daily_consumption: parseFloat(get("avg daily consumption")) || 0,
      material_in_transit: parseFloat(get("material in transit")) || 0,
      from_seller: get("from/seller"),
      lead_time: parseFloat(get("lead time (i2r)")) || 0,
      safety_factor: parseFloat(get("safety factor")) || 0,
      max_level: maxLevel,
      total_available: totalAvailable,
    };
  }

  mapItemToRow(item: StationaryItem): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("sku code", item.sku_code);
    set("category", item.category);
    set("item name", item.item_name);
    set("moq", item.moq);
    set("avg daily consumption", item.avg_daily_consumption);
    set("material in transit", item.material_in_transit);
    set("from/seller", item.from_seller);
    set("lead time (i2r)", item.lead_time);
    set("safety factor", item.safety_factor);
    
    // Formula calculation before saving
    const maxLevel = item.avg_daily_consumption * item.lead_time * item.safety_factor;
    set("max level", maxLevel);
    set("total available", item.total_available);

    return row;
  }

  public getCanonicalHeaders() {
    return this.CANONICAL_HEADERS;
  }
}

class StationaryLogService extends BaseSheetsService<StationaryLog> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = LOGS_SHEET_NAME;
  protected range = "A:G";
  protected idColumnIndex = 0; // Assuming ID is generated

  private readonly CANONICAL_HEADERS = [
    "ID", "Timestamp", "SKU Code", "ITEM NAME", "Transaction Type", 
    "Quantity", "Remarks", "User"
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): StationaryLog {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    return {
      id: get("id"),
      timestamp: get("timestamp"),
      sku_code: get("sku code"),
      item_name: get("item name"),
      transaction_type: get("transaction type") as "IN" | "OUT",
      quantity: parseFloat(get("quantity")) || 0,
      remarks: get("remarks"),
      user: get("user")
    };
  }

  mapItemToRow(item: StationaryLog): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id || Date.now().toString());
    set("timestamp", item.timestamp);
    set("sku code", item.sku_code);
    set("item name", item.item_name);
    set("transaction type", item.transaction_type);
    set("quantity", item.quantity);
    set("remarks", item.remarks);
    set("user", item.user);

    return row;
  }

  public getCanonicalHeaders() {
    return this.CANONICAL_HEADERS;
  }
}

export const stationaryMasterService = new StationaryMasterService();
export const stationaryLogService = new StationaryLogService();

export async function getStationaryItems(): Promise<StationaryItem[]> {
  return stationaryMasterService.getAll();
}

export async function addStationaryItem(data: Partial<StationaryItem>): Promise<boolean> {
  if (!data.id) data.id = data.sku_code || "";
  await stationaryMasterService.ensureColumns(stationaryMasterService.getCanonicalHeaders());
  return stationaryMasterService.add(data as StationaryItem);
}

export async function updateStationaryItem(id: string, data: StationaryItem): Promise<boolean> {
  await stationaryMasterService.ensureColumns(stationaryMasterService.getCanonicalHeaders());
  return stationaryMasterService.update(id, data);
}

export async function deleteStationaryItem(id: string): Promise<boolean> {
  return stationaryMasterService.delete(id);
}

export async function getStationaryLogs(): Promise<StationaryLog[]> {
  return stationaryLogService.getAll();
}

export async function addStationaryLog(data: Partial<StationaryLog>): Promise<boolean> {
  if (!data.id) data.id = Date.now().toString();
  await stationaryLogService.ensureColumns(stationaryLogService.getCanonicalHeaders());
  return stationaryLogService.add(data as StationaryLog);
}

// Helper to record stock transaction and update master
export async function logStockTransaction(log: Partial<StationaryLog>): Promise<boolean> {
  const masterItems = await getStationaryItems();
  const item = masterItems.find(i => i.sku_code === log.sku_code);
  
  if (!item) {
    throw new Error("Item not found in master sheet");
  }

  // 1. Calculate new total available
  const newTotal = log.transaction_type === "IN" 
    ? item.total_available + (log.quantity || 0)
    : item.total_available - (log.quantity || 0);

  item.total_available = newTotal;

  // 2. Update Master
  const masterUpdated = await updateStationaryItem(item.sku_code, item);
  if (!masterUpdated) return false;

  // 3. Append to Logs
  log.timestamp = log.timestamp || new Date().toISOString();
  return addStationaryLog(log);
}
