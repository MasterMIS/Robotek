export interface RechargeItem {
  id: string; // We'll use Timestamp or a generated ID as the unique identifier
  timestamp: string;
  filled_by: string;
  doer_wifi_name: string;
  phone_wifi_num: string;
  date_of_recharge: string;
  validity: string;
  amount: string;
  attach_bill: string;
  type: "Recharge" | "Remove from Recharge";
}
