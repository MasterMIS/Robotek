export interface Replace {
  id: string;
  rn_num: string;
  receiver_name: string;
  party_name: string;
  num_of_parcel: string;
  parcel_photo: string;
  send_kundli: string;
  pc_remarks: string;
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
  total_weight_3: string;
  weight_image_3: string;

  // Step 4
  planned_4: string;
  actual_4: string;
  status_4: string;
  ss_of_detail_4: string;

  // Step 5
  planned_5: string;
  actual_5: string;
  status_5: string;
  voucher_no_5: string;
  voucher_image_5: string;

  // Step 6
  planned_6: string;
  actual_6: string;
  status_6: string;

  // Step 7
  planned_7: string;
  actual_7: string;
  status_7: string;

  // Step 8
  planned_8: string;
  actual_8: string;
  status_8: string;

  // Step 9
  planned_9: string;
  actual_9: string;
  status_9: string;
}

export interface ReplaceStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const REPLACE_STEPS = [
  "Inward Receipt",
  "Checking & Verification",
  "Weight Confirmation",
  "Detailed Analysis",
  "Voucher Generation",
  "Approval Workflow",
  "Quality Assurance",
  "Outward Preparation",
  "Final Handover"
];
