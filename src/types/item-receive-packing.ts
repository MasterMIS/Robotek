export interface ItemReceivePacking {
  id: string;
  ppr_num: string;
  item_name: string;
  supplier_name: string;
  po_no: string;
  qty: string;
  attach_bill: string;
  payment_completed: string;
  payment_terms_in_days: string;
  created_at: string;
  updated_at: string;
  cancelled: string;

  // Step 1: call supplier for remaining goods
  planned_1: string;
  actual_1: string;
  status_1: string;

  // Step 2: Quality And Quantity Check Passed?
  planned_2: string;
  actual_2: string;
  status_2: string;
  quality_status_2: string;
  quality_status_remarks_2: string;

  // Step 3: Purchase Update
  planned_3: string;
  actual_3: string;
  status_3: string;

  // Step 4: Payment Vendor
  planned_4: string;
  actual_4: string;
  status_4: string;
}

export interface ItemReceivePackingStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const ITEM_RECEIVE_PACKING_STEPS = [
  "call supplier for remaining goods",
  "Quality And Quantity Check Passed?",
  "Purchase Update",
  "Payment Vendor"
];
