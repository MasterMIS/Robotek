export interface DataFeeder {
  id: string; // Internal ID
  employeeName: string;
  employeeNumber: string;
  toName: string;
  countryCode: string;
  toNumber: string;
  callType: string;
  duration: string;
  callDate: string;
  callTime: string;
  timestamp?: string;
  updated_at?: string;
}
