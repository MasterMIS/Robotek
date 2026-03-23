export interface O2D {
  id: string;
  order_no: string;
  party_name: string;
  item_name: string;
  item_qty: string;
  est_amount: string;
  remark: string;
  order_screenshot: string; // File ID or URL
  filled_by: string;
  created_at: string;
  updated_at: string;
}

export interface O2DItem {
  item_name: string;
  item_qty: string;
  est_amount: string;
}
