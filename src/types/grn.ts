export interface GRN {
  id: string;
  GRN_No: string;
  PO_Number: string;
  Item_Name: string;
  Category: string;
  Qty: string;
  Country: string;
  Attach_Bill: string;
  Payment_Terms_In_days: string;
  Payment_Completed: string;
  filled_by: string;
  updated_at?: string;
  indent_id?: string; // Hidden field to link back to I2R
}
