export interface I2R {
  id: string;
  indend_num: string;
  item_name: string;
  quantity: string;
  category: string;
  filled_by: string;
  created_at: string;
  updated_at: string;
  cancelled: string;
  // Steps
  planned_1: string; actual_1: string; status_1: string;
  planned_2: string; actual_2: string; status_2: string;
  planned_3: string; actual_3: string; status_3: string;
  planned_4: string; actual_4: string; status_4: string;
  planned_5: string; actual_5: string; status_5: string;
  planned_6: string; actual_6: string; status_6: string;
  planned_7: string; actual_7: string; status_7: string;
  planned_8: string; actual_8: string; status_8: string;
  planned_9: string; actual_9: string; status_9: string;
  planned_10: string; actual_10: string; status_10: string;
  // Extra step metadata
  supplier_name_3: string;
  lead_time_acc_to_vendor_4: string;
  sample_pic_5: string;
  po_number_6: string;
}

export interface I2RStepConfig {
  step_name: string;
  tat: string;
  responsible_person: string;
}

export const I2R_STEPS = [
  "Get quotation form three vendors (NA, if vendor is only one / regular vendor)",
  "TAKE APPROVAL FROM SAHIL SIR",
  "Finalize Vendor and Rates",
  "Received PI",
  "Check Physical Sample",
  "Make Po",
  "Check Packing Status in warehouse and Order Packing",
  "Delivered to cargo",
  "Fill Receive material Form",
  "Follow up till Full material received or waive off Qty",
];
