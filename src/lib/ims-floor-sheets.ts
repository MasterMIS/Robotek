import { BaseSheetsService } from "./sheets/base-service";
import { FloorIMS } from "@/types/ims-floor";

const SPREADSHEET_ID = "12lk8GV7ZBpm6J-bA5TBWfHQ1qY0eEHIrwOICSnsuceE";

class FloorIMSService extends BaseSheetsService<FloorIMS> {
  protected spreadsheetId = SPREADSHEET_ID;
  protected sheetName: string;
  protected range = "A:F";
  protected idColumnIndex = 0;

  constructor(sheetName: string) {
    super();
    this.sheetName = sheetName;
  }

  mapRowToItem(row: any[]): FloorIMS {
    const get = (h: string, fallbackIdx: number) => {
      const idx = this.hMap[h.toLowerCase()];
      return (idx !== undefined ? row[idx] : row[fallbackIdx]) || "";
    };
    return {
      id: get("id", 0),
      item_name: get("item name", 1),
      category: get("category", 2),
      in_qty: get("in qty", 3),
      out_qty: get("out qty", 4),
      updated_at: get("updated_at", 5),
    };
  }

  mapItemToRow(ims: FloorIMS): any[] {
    const row: any[] = ["", "", "", "", "", ""];
    const set = (h: string, fallbackIdx: number, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      row[idx !== undefined ? idx : fallbackIdx] = val ?? "";
    };

    set("id", 0, String(ims.id));
    set("item name", 1, ims.item_name);
    set("category", 2, ims.category);
    set("in qty", 3, ims.in_qty);
    set("out qty", 4, ims.out_qty);
    set("updated_at", 5, ims.updated_at);

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

export const ims1stFloorService = new FloorIMSService("IMS-1st Floor");
export const imsGFloorService = new FloorIMSService("IMS-G Floor");

let locks: Record<string, Promise<any>> = {
  "1st": Promise.resolve(),
  "g": Promise.resolve()
};

function getService(location: string) {
  if (location === "1st") return ims1stFloorService;
  if (location === "g") return imsGFloorService;
  throw new Error("Invalid location");
}

export async function getFloorIMSItems(location: string): Promise<FloorIMS[]> {
  const service = getService(location);
  const items = await service.getAll();
  return items.map(item => {
    const inQty = parseFloat(item.in_qty) || 0;
    const outQty = parseFloat(item.out_qty) || 0;
    return { ...item, live_stock: inQty - outQty };
  });
}

export async function addFloorIMSItem(location: string, data: Partial<FloorIMS>): Promise<boolean> {
  const service = getService(location);
  return (locks[location] = locks[location]
    .then(async () => {
      if (!data.id) {
        data.id = (await service.getNextNumericalId()).toString();
      }
      return service.add(data as FloorIMS);
    })
    .catch((err) => {
      console.error(`Error in addFloorIMSItem lock (${location}):`, err);
      return false;
    }));
}

export async function updateFloorIMSItem(location: string, id: string, data: FloorIMS): Promise<boolean> {
  const service = getService(location);
  return service.update(id, data);
}

export async function deleteFloorIMSItem(location: string, id: string): Promise<boolean> {
  const service = getService(location);
  return service.delete(id);
}
