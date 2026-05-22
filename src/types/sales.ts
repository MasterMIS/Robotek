export interface SalesLead {
  id: string; // The generated L-001 format
  created_at: string;
  filled_by: string;
  name: string;
  company_name: string;
  phone_number: string;
  area: string;
  state_and_ut: string;
  country: string;
  enquiry_for: string;
  enquiry_products: string;
  sources_of_customer: string;
  sales_person_assigned: string;
  investment_amount: string;
  current_monthly_turnover: string;
  existing_products: string;
  planned_time: string;
  actual_time: string;
  status: string;
  sc_remark: string;
  ss_remark: string;
  party_remark: string;
  qualified_status: string;
  qualified_timestamp: string;
  document_link: string;
  remark: string;
  sales_coordinator_name: string;
  lead_priority_type: string;
}

export interface FollowUp {
  id: string; // Follow Up Id
  timestamp: string;
  lead_id: string; // To link to SalesLead
  next_follow_up_date: string;
  status: string;
  lead_time: string;
  remark: string;
  billing_date: string;
  billing_amount: string;
  ss_name: string;
  dealing_with: string;
}
