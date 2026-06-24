export interface O2DKB {
  id: string;
  order_no: string;
  party_name: string;
  item_details?: string;
  remark: string;
  filled_by: string;
  created_at: string;
  updated_at: string;

  cancelled?: string;
  hold?: string;

  // Step 1: Bill Update in Busy
  planned_1?: string; actual_1?: string; status_1?: string;
  voucher_num_1?: string; attach_bill_1?: string;

  // Step 2: Bill Share to Party
  planned_2?: string; actual_2?: string; status_2?: string;

  // Step 3: Dispatch & Packing Approval
  planned_3?: string; actual_3?: string; status_3?: string;

  // Step 4: Reconfirm Approval
  planned_4?: string; actual_4?: string; status_4?: string;

  // Step 5: Packing
  planned_5?: string; actual_5?: string; status_5?: string;

  // Step 6: Dispatching
  planned_6?: string; actual_6?: string; status_6?: string;

  // Step 7: Share Billty
  planned_7?: string; actual_7?: string; status_7?: string;
  attach_billty_7?: string;

  order_screenshot?: string;
  [key: string]: any;
}

export interface O2DKBItemDetail {
  item_name: string;
  item_qty: string;
  remark?: string;
}

export interface O2DKBStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const O2DKB_STEPS = [
  "Bill Update in Busy",
  "Bill Share to Party",
  "Dispatch & Packing Approval",
  "Reconfirm Approval",
  "Packing",
  "Dispatching",
  "Share Billty"
];

export const O2DKB_STEP_SHORTS = [
  "Bill Update",
  "Bill Share",
  "Dispatch App.",
  "Reconfirm App.",
  "Packing",
  "Dispatching",
  "Share Billty"
];
