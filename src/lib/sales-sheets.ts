import { BaseSheetsService } from "./sheets/base-service";
import { SalesLead, FollowUp } from "@/types/sales";

const GOOGLE_SHEET_ID = "161bYATLTS6w6oC0m23Aa7eAHqZT8sL11Ig2IbNWfjiU";
const SALES_SHEET_NAME = "Sales";
const FOLLOW_UP_SHEET_NAME = "Follow Up";

class SalesService extends BaseSheetsService<SalesLead> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = SALES_SHEET_NAME;
  protected range = "A:AB";
  protected idColumnIndex = 2; // Lead id is the 3rd column (index 2)

  private readonly CANONICAL_HEADERS = [
    "Created At", "Filled By", "Lead id", "Name", "Company Name", 
    "Phone Number", "Area", "State And Ut", "Country", "Enquiry For", 
    "Enquiry Products", "Sources Of Customer(Lead Generate)", 
    "Sales Person Assigned", "Investment Amount", "Current Monthly Turnover", 
    "Existing Products/Brand Selling", "Planned Time", "Actual Time", 
    "Status", "SC Remark", "SS Remark", "Party Remark", "Qualified Status", 
    "Qualified Timestamp", "Document Link", "Remark", "Sales Coordinator Name", 
    "Lead Priority Type"
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): SalesLead {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    return {
      created_at: get("created at"),
      filled_by: get("filled by"),
      id: get("lead id"),
      name: get("name"),
      company_name: get("company name"),
      phone_number: get("phone number"),
      area: get("area"),
      state_and_ut: get("state and ut"),
      country: get("country"),
      enquiry_for: get("enquiry for"),
      enquiry_products: get("enquiry products"),
      sources_of_customer: get("sources of customer(lead generate)"),
      sales_person_assigned: get("sales person assigned"),
      investment_amount: get("investment amount"),
      current_monthly_turnover: get("current monthly turnover"),
      existing_products: get("existing products/brand selling"),
      planned_time: get("planned time"),
      actual_time: get("actual time"),
      status: get("status"),
      sc_remark: get("sc remark"),
      ss_remark: get("ss remark"),
      party_remark: get("party remark"),
      qualified_status: get("qualified status"),
      qualified_timestamp: get("qualified timestamp"),
      document_link: get("document link"),
      remark: get("remark"),
      sales_coordinator_name: get("sales coordinator name"),
      lead_priority_type: get("lead priority type"),
    };
  }

  mapItemToRow(item: SalesLead): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("created at", item.created_at);
    set("filled by", item.filled_by);
    set("lead id", item.id);
    set("name", item.name);
    set("company name", item.company_name);
    set("phone number", item.phone_number);
    set("area", item.area);
    set("state and ut", item.state_and_ut);
    set("country", item.country);
    set("enquiry for", item.enquiry_for);
    set("enquiry products", item.enquiry_products);
    set("sources of customer(lead generate)", item.sources_of_customer);
    set("sales person assigned", item.sales_person_assigned);
    set("investment amount", item.investment_amount);
    set("current monthly turnover", item.current_monthly_turnover);
    set("existing products/brand selling", item.existing_products);
    set("planned time", item.planned_time);
    set("actual time", item.actual_time);
    set("status", item.status);
    set("sc remark", item.sc_remark);
    set("ss remark", item.ss_remark);
    set("party remark", item.party_remark);
    set("qualified status", item.qualified_status);
    set("qualified timestamp", item.qualified_timestamp);
    set("document link", item.document_link);
    set("remark", item.remark);
    set("sales coordinator name", item.sales_coordinator_name);
    set("lead priority type", item.lead_priority_type);

    return row;
  }

  async getNextLeadId(): Promise<string> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const idColIdx = this.hMap["lead id"];
      if (idColIdx === undefined) return "L-001";

      const letter = this.getColLetter(idColIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${letter}:${letter}`,
      });

      const values = response.data.values?.slice(1) || [];
      let maxNum = 0;
      for (const row of values) {
        const val = String(row[0] || "");
        const match = val.match(/L-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `L-${String(maxNum + 1).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating Lead ID:", error);
      return "L-001";
    }
  }

  private getColLetter(colIndex: number): string {
    let temp, letter = "";
    let col = colIndex + 1;
    while (col > 0) {
      temp = (col - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = Math.floor((col - temp - 1) / 26);
    }
    return letter;
  }
  
  public getCanonicalHeaders() {
      return this.CANONICAL_HEADERS;
  }
}

class FollowUpService extends BaseSheetsService<FollowUp> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = FOLLOW_UP_SHEET_NAME;
  protected range = "A:K"; // Timestamp to Dealing with + Lead ID
  protected idColumnIndex = 1; // Follow Up Id

  private readonly CANONICAL_HEADERS = [
    "Timestamp", "Follow Up Id", "Lead ID", "Next Follow Up Date", 
    "Status", "Lead Time", "Remark", "Billing Date", "Billing Amount", 
    "SS Name", "Dealing with" // Assuming "Lead ID" needs to be stored to link back to the sales lead
  ].map(h => h.toLowerCase());

  mapRowToItem(row: any[]): FollowUp {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    return {
      timestamp: get("timestamp"),
      id: get("follow up id"),
      lead_id: get("lead id"),
      next_follow_up_date: get("next follow up date"),
      status: get("status"),
      lead_time: get("lead time"),
      remark: get("remark"),
      billing_date: get("billing date"),
      billing_amount: get("billing amount"),
      ss_name: get("ss name"),
      dealing_with: get("dealing with"),
    };
  }

  mapItemToRow(item: FollowUp): any[] {
    const totalCols = this.CANONICAL_HEADERS.length;
    const row: any[] = Array(totalCols).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("timestamp", item.timestamp);
    set("follow up id", item.id);
    set("lead id", item.lead_id);
    set("next follow up date", item.next_follow_up_date);
    set("status", item.status);
    set("lead time", item.lead_time);
    set("remark", item.remark);
    set("billing date", item.billing_date);
    set("billing amount", item.billing_amount);
    set("ss name", item.ss_name);
    set("dealing with", item.dealing_with);

    return row;
  }

  async getNextFollowUpId(): Promise<string> {
    await this.ensureHeaders();
    try {
      const sheets = await this.getSheetsClient();
      const idColIdx = this.hMap["follow up id"];
      if (idColIdx === undefined) return "FU-001";

      const letter = this.getColLetter(idColIdx);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!${letter}:${letter}`,
      });

      const values = response.data.values?.slice(1) || [];
      let maxNum = 0;
      for (const row of values) {
        const val = String(row[0] || "");
        const match = val.match(/FU-(\d+)/i);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) maxNum = num;
        }
      }
      return `FU-${String(maxNum + 1).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating Follow Up ID:", error);
      return "FU-001";
    }
  }

  private getColLetter(colIndex: number): string {
    let temp, letter = "";
    let col = colIndex + 1;
    while (col > 0) {
      temp = (col - 1) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      col = Math.floor((col - temp - 1) / 26);
    }
    return letter;
  }
  
  public getCanonicalHeaders() {
      return this.CANONICAL_HEADERS;
  }
}

export const salesService = new SalesService();
export const followUpService = new FollowUpService();

export async function getSalesLeads(): Promise<SalesLead[]> {
  return salesService.getAll();
}

let salesLock: Promise<any> = Promise.resolve();

export async function addSalesLead(data: Partial<SalesLead>): Promise<boolean> {
  return (salesLock = salesLock
    .then(async () => {
      if (!data.id) {
        data.id = await salesService.getNextLeadId();
      }
      data.created_at = data.created_at || new Date().toISOString();
      await salesService.ensureColumns(salesService.getCanonicalHeaders());
      return salesService.add(data as SalesLead);
    })
    .catch((err) => {
      console.error("Error in addSalesLead lock:", err);
      return false;
    }));
}

export async function updateSalesLead(id: string, data: SalesLead): Promise<boolean> {
  await salesService.ensureColumns(salesService.getCanonicalHeaders());
  return salesService.update(id, data);
}

export async function getFollowUps(leadId?: string): Promise<FollowUp[]> {
  const allFollowUps = await followUpService.getAll();
  if (leadId) {
    return allFollowUps.filter(f => f.lead_id === leadId);
  }
  return allFollowUps;
}

let followUpLock: Promise<any> = Promise.resolve();

export async function addFollowUp(data: Partial<FollowUp>): Promise<boolean> {
  return (followUpLock = followUpLock
    .then(async () => {
      if (!data.id) {
        data.id = await followUpService.getNextFollowUpId();
      }
      data.timestamp = data.timestamp || new Date().toISOString();
      await followUpService.ensureColumns(followUpService.getCanonicalHeaders());
      return followUpService.add(data as FollowUp);
    })
    .catch((err) => {
      console.error("Error in addFollowUp lock:", err);
      return false;
    }));
}
