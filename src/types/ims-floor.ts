export interface FloorIMS {
  id: string;
  item_name: string;
  category: string;
  in_qty: string;
  out_qty: string;
  date?: string;
  updated_at?: string;
  packed_status?: string;
  // Computed in frontend/API
  live_stock?: number;
}
