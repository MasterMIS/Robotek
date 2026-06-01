export interface AssetItem {
  id: string;
  asset_id: string;
  category: string;
  asset_name: string;
  assigned_to: string;
  status: "Available" | "In Use" | "Maintenance" | "Retired";
  serial_number: string;
  purchase_date: string;
  location: string;
  remarks: string;
  updated_at?: string;
}

export interface AssetAllocation {
  id: string;
  asset_id: string;
  employee_id: string;
  from_employee?: string;
  assigned_date: string;
  expected_return_date?: string;
  return_date?: string;
  condition: string;
  remarks: string;
  status: "Active" | "Returned";
  created_at?: string;
}

export interface AssetMaintenance {
  id: string;
  asset_id: string;
  maintenance_type: "Preventive" | "Repair" | "Upgrade" | "Replacement";
  complaint_date: string;
  repair_date?: string;
  vendor: string;
  cost: string;
  status: "Pending" | "In Progress" | "Completed";
  notes: string;
  created_at?: string;
}
