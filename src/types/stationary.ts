export interface StationaryItem {
  id: string;
  sku_code: string;
  category: string;
  item_name: string;
  moq: number;
  avg_daily_consumption: number;
  material_in_transit: number;
  from_seller: string;
  lead_time: number;
  safety_factor: number;
  max_level: number;
  total_available: number;
}

export interface StationaryLog {
  id: string;
  timestamp: string;
  sku_code: string;
  item_name: string;
  transaction_type: "IN" | "OUT";
  quantity: number;
  remarks: string;
  user: string;
}
