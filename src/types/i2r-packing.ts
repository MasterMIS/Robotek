export interface I2RPacking {
  id: string;
  ppf_num: string;
  packing_design: string;
  total_qty: string;
  last_suppliar: string;
  item_name: string;
  required_by: string;
  created_at: string;
  updated_at: string;
  cancelled: string;

  // Step 1
  planned_1: string;
  actual_1: string;
  status_1: string;

  // Step 2
  planned_2: string;
  actual_2: string;
  status_2: string;

  // Step 3
  planned_3: string;
  actual_3: string;
  status_3: string;
  vendor_name_3: string;
  lead_time_3: string;
  pi_3: string;

  // Step 4
  planned_4: string;
  actual_4: string;
  status_4: string;
  po_num_4: string;

  // Step 5
  planned_5: string;
  actual_5: string;
  status_5: string;

  // Step 6
  planned_6: string;
  actual_6: string;
  status_6: string;
}

export interface I2RPackingStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const I2R_PACKING_STEPS = [
  "Give (Spec. & Image) to Designer",
  "Make Design",
  "Finalize Vendor & Rates",
  "Generate All PO",
  "Approve KLD File and Reply to Vendor",
  "Item Recieve Form"
];
