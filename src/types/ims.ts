export interface IMS {
  id: string;
  item_name: string;
  est_amount_item: string;
  gst: string;
  final_amount: string;
  category: string;
  in_qty?: number;
  out_qty?: number;
  live_stock?: number;
  sale_percent?: number;
  avg_daily_con?: number;
  lead_time?: number;
  safety_factor?: number;
  max_level?: number;
}
