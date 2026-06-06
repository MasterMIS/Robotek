import { BaseSheetsService } from "./sheets/base-service";
import { Recruitment, Candidate, Sales, Onboard, HrmsStepConfig, HrmsModuleType, AnyHrmsRecord } from "@/types/hrms";
import { globalCache } from "./cache";

const GOOGLE_SHEET_ID = "1q00QfCvnk69ZHXZ9ZPPHXXLDBDfSAfqk20MK15xqOVk";

const DEFAULT_HRMS_STEPS: Record<HrmsModuleType, string[]> = {
  recruitment: [
    "Requirement Post on all sites and Social Media",
    "Start Receiving Resume and give Recrutment Form",
    "Start Filtering Resume as per MPR",
    "Start Connecting Candidate Via Calls or Chat",
    "Recruitment Done"
  ],
  candidate: [
    "Communicate with the Candidate",
    "Screening Candidate for Interview",
    "Online Assesment",
    "Face to Face Interview",
    "Give Data Cable to Candidate",
    "Interview by Management Members",
    "If selected check References"
  ],
  sales: [
    "Basics Questions",
    "Full Questionnaire",
    "Documantation (Inc Salary Proof, last company releaving letter)",
    "Verification",
    "2nd Round Interview + Mock Test",
    "3rd Round",
    "Company Profile PPT, USP of Products, Video of manufecturing unit, catalog show, live product demo and Q&A",
    "Final Decision"
  ],
  onboard: [
    "Trial of Selected Candidate",
    "Give Offer Letter with probation period Policies with sign",
    "Provide Joining Kit",
    "Evaluation in 30 Days",
    "Evaluation in 60 Days",
    "Evaluation in 90 Days",
    "Extend Candidate Provbation Period/Issue Appointment Letter",
    "Re- Evaluation 1",
    "Re- Evaluation 2",
    "Re- Evaluation 3",
    "Issue Appointment Letter"
  ]
};

class RecruitmentService extends BaseSheetsService<Recruitment> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Recruitment";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "Id", "post_for_recruitment", "no_of_post_for_recruitment", "for_which_location", "urgency", "male_female", 
    "age_group", "qualifications", "skills_required", "experience_needed_for_the_role", "work_and_responsibilities", 
    "planned_ctc", "requirement_by", "created_at", "updated_at", "Cancelled",
    "Planned_1", "Actual_1", "Social_Medias_1", "Remark_1",
    "Planned_2", "Actual_2", "Status_2", "Remark_2",
    "Planned_3", "Actual_3", "Status_3", "Remark_3",
    "Planned_4", "Actual_4", "Status_4", "Remark_4",
    "Planned_5", "Actual_5", "Status_5", "Remark_5"
  ];

  mapRowToItem(row: any[]): Recruitment {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("Id"),
      post_for_recruitment: get("post_for_recruitment"),
      no_of_post_for_recruitment: get("no_of_post_for_recruitment"),
      for_which_location: get("for_which_location"),
      urgency: get("urgency"),
      male_female: get("male_female"),
      age_group: get("age_group"),
      qualifications: get("qualifications"),
      skills_required: get("skills_required"),
      experience_needed_for_the_role: get("experience_needed_for_the_role"),
      work_and_responsibilities: get("work_and_responsibilities"),
      planned_ctc: get("planned_ctc"),
      requirement_by: get("requirement_by"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      cancelled: get("Cancelled"),
      social_medias_1: get("Social_Medias_1"),
    };
    for (let i = 1; i <= 5; i++) {
      item[`planned_${i}`] = get(`Planned_${i}`);
      item[`actual_${i}`] = get(`Actual_${i}`);
      item[`remark_${i}`] = get(`Remark_${i}`);
      if (i > 1) item[`status_${i}`] = get(`Status_${i}`);
    }
    return item as Recruitment;
  }

  mapItemToRow(item: Recruitment): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("Id", item.id);
    set("post_for_recruitment", item.post_for_recruitment);
    set("no_of_post_for_recruitment", item.no_of_post_for_recruitment);
    set("for_which_location", item.for_which_location);
    set("urgency", item.urgency);
    set("male_female", item.male_female);
    set("age_group", item.age_group);
    set("qualifications", item.qualifications);
    set("skills_required", item.skills_required);
    set("experience_needed_for_the_role", item.experience_needed_for_the_role);
    set("work_and_responsibilities", item.work_and_responsibilities);
    set("planned_ctc", item.planned_ctc);
    set("requirement_by", item.requirement_by);
    set("created_at", item.created_at);
    set("updated_at", (item as any).updated_at);
    set("Cancelled", item.cancelled);
    set("Social_Medias_1", (item as any).social_medias_1);

    for (let i = 1; i <= 5; i++) {
      set(`Planned_${i}`, (item as any)[`planned_${i}`]);
      set(`Actual_${i}`, (item as any)[`actual_${i}`]);
      set(`Remark_${i}`, (item as any)[`remark_${i}`]);
      if (i > 1) set(`Status_${i}`, (item as any)[`status_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => {
      const match = String(id).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class CandidateService extends BaseSheetsService<Candidate> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Candidate";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "Id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_in_days", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "created_at", "updated_at", "Cancelled",
    "Planned_1", "Actual_1", "Status_1", "Remark_1",
    "Planned_2", "Actual_2", "Status_2", "Remark_2",
    "Planned_3", "Actual_3", "Status_3", "Remark_3",
    "Planned_4", "Actual_4", "Status_4", "Remark_4",
    "Planned_5", "Actual_5", "Status_5", "Remark_5",
    "Planned_6", "Actual_6", "Status_6", "Remark_6",
    "Planned_7", "Actual_7", "Status_7", "Remark_7", "Lead_Time_For_Emp._Joining_7"
  ];

  mapRowToItem(row: any[]): Candidate {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("Id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_in_days"),
      reason_for_quit: get("reason_for_quit"),
      share_two_professional_references: get("share_two_professional_references"),
      current_living_location: get("current_living_location"),
      upload_updated_cv: get("upload_updated_cv"),
      whatsapp_number: get("whatsapp_number"),
      gtk_office_comfortable: get("gtk_office_comfortable"),
      slot_booking: get("slot_booking"),
      remark: get("remark"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      cancelled: get("Cancelled"),
      lead_time_for_emp_joining_7: get("Lead_Time_For_Emp._Joining_7")
    };
    for (let i = 1; i <= 7; i++) {
      item[`planned_${i}`] = get(`Planned_${i}`);
      item[`actual_${i}`] = get(`Actual_${i}`);
      item[`status_${i}`] = get(`Status_${i}`);
      item[`remark_${i}`] = get(`Remark_${i}`);
    }
    return item as Candidate;
  }

  mapItemToRow(item: Candidate): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("Id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_in_days", item.notice_period_in_days);
    set("reason_for_quit", item.reason_for_quit);
    set("share_two_professional_references", item.share_two_professional_references);
    set("current_living_location", item.current_living_location);
    set("upload_updated_cv", item.upload_updated_cv);
    set("whatsapp_number", item.whatsapp_number);
    set("gtk_office_comfortable", item.gtk_office_comfortable);
    set("slot_booking", item.slot_booking);
    set("remark", item.remark);
    set("created_at", item.created_at);
    set("updated_at", (item as any).updated_at);
    set("Cancelled", item.cancelled);
    set("Lead_Time_For_Emp._Joining_7", item.lead_time_for_emp_joining_7);

    for (let i = 1; i <= 7; i++) {
      set(`Planned_${i}`, (item as any)[`planned_${i}`]);
      set(`Actual_${i}`, (item as any)[`actual_${i}`]);
      set(`Status_${i}`, (item as any)[`status_${i}`]);
      set(`Remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => {
      const match = String(id).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class SalesService extends BaseSheetsService<Sales> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Sales";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "Id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_in_days", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "lead_time", "created_at", "updated_at", "Cancelled",
    "Planned_1", "Actual_1", "Status_1", "Remark_1",
    "Planned_2", "Actual_2", "Status_2", "Remark_2",
    "Planned_3", "Actual_3", "Status_3", "Remark_3",
    "Planned_4", "Actual_4", "Status_4", "Remark_4",
    "Planned_5", "Actual_5", "Status_5", "Remark_5",
    "Planned_6", "Actual_6", "Status_6", "Remark_6",
    "Planned_7", "Actual_7", "Status_7", "Remark_7",
    "Planned_8", "Actual_8", "Status_8", "Remark_8"
  ];

  mapRowToItem(row: any[]): Sales {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("Id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_in_days"),
      reason_for_quit: get("reason_for_quit"),
      share_two_professional_references: get("share_two_professional_references"),
      current_living_location: get("current_living_location"),
      upload_updated_cv: get("upload_updated_cv"),
      whatsapp_number: get("whatsapp_number"),
      gtk_office_comfortable: get("gtk_office_comfortable"),
      slot_booking: get("slot_booking"),
      remark: get("remark"),
      lead_time: get("lead_time"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      cancelled: get("Cancelled"),
    };
    for (let i = 1; i <= 8; i++) {
      item[`planned_${i}`] = get(`Planned_${i}`);
      item[`actual_${i}`] = get(`Actual_${i}`);
      item[`status_${i}`] = get(`Status_${i}`);
      item[`remark_${i}`] = get(`Remark_${i}`);
    }
    return item as Sales;
  }

  mapItemToRow(item: Sales): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("Id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_in_days", item.notice_period_in_days);
    set("reason_for_quit", item.reason_for_quit);
    set("share_two_professional_references", item.share_two_professional_references);
    set("current_living_location", item.current_living_location);
    set("upload_updated_cv", item.upload_updated_cv);
    set("whatsapp_number", item.whatsapp_number);
    set("gtk_office_comfortable", item.gtk_office_comfortable);
    set("slot_booking", item.slot_booking);
    set("remark", item.remark);
    set("lead_time", item.lead_time);
    set("created_at", item.created_at);
    set("updated_at", (item as any).updated_at);
    set("Cancelled", item.cancelled);

    for (let i = 1; i <= 8; i++) {
      set(`Planned_${i}`, (item as any)[`planned_${i}`]);
      set(`Actual_${i}`, (item as any)[`actual_${i}`]);
      set(`Status_${i}`, (item as any)[`status_${i}`]);
      set(`Remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => {
      const match = String(id).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class OnboardService extends BaseSheetsService<Onboard> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Onboard";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "Id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_in_days", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "lead_time", "created_at", "updated_at", "Cancelled",
    "Planned_1", "Actual_1", "Status_1", "Remark_1",
    "Planned_2", "Actual_2", "Status_2", "Remark_2",
    "Planned_3", "Actual_3", "Status_3", "Remark_3",
    "Planned_4", "Actual_4", "Status_4", "Remark_4",
    "Planned_5", "Actual_5", "Status_5", "Remark_5",
    "Planned_6", "Actual_6", "Status_6", "Remark_6",
    "Planned_7", "Actual_7", "Status_7", "Remark_7",
    "Planned_8", "Actual_8", "Status_8", "Remark_8",
    "Planned_9", "Actual_9", "Status_9", "Remark_9",
    "Planned_10", "Actual_10", "Status_10", "Remark_10",
    "Planned_11", "Actual_11", "Status_11", "Remark_11"
  ];

  mapRowToItem(row: any[]): Onboard {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("Id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_in_days"),
      reason_for_quit: get("reason_for_quit"),
      share_two_professional_references: get("share_two_professional_references"),
      current_living_location: get("current_living_location"),
      upload_updated_cv: get("upload_updated_cv"),
      whatsapp_number: get("whatsapp_number"),
      gtk_office_comfortable: get("gtk_office_comfortable"),
      slot_booking: get("slot_booking"),
      remark: get("remark"),
      lead_time: get("lead_time"),
      created_at: get("created_at"),
      updated_at: get("updated_at"),
      cancelled: get("Cancelled"),
    };
    for (let i = 1; i <= 11; i++) {
      item[`planned_${i}`] = get(`Planned_${i}`);
      item[`actual_${i}`] = get(`Actual_${i}`);
      item[`status_${i}`] = get(`Status_${i}`);
      item[`remark_${i}`] = get(`Remark_${i}`);
    }
    return item as Onboard;
  }

  mapItemToRow(item: Onboard): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("Id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_in_days", item.notice_period_in_days);
    set("reason_for_quit", item.reason_for_quit);
    set("share_two_professional_references", item.share_two_professional_references);
    set("current_living_location", item.current_living_location);
    set("upload_updated_cv", item.upload_updated_cv);
    set("whatsapp_number", item.whatsapp_number);
    set("gtk_office_comfortable", item.gtk_office_comfortable);
    set("slot_booking", item.slot_booking);
    set("remark", item.remark);
    set("lead_time", item.lead_time);
    set("created_at", item.created_at);
    set("updated_at", (item as any).updated_at);
    set("Cancelled", item.cancelled);

    for (let i = 1; i <= 11; i++) {
      set(`Planned_${i}`, (item as any)[`planned_${i}`]);
      set(`Actual_${i}`, (item as any)[`actual_${i}`]);
      set(`Status_${i}`, (item as any)[`status_${i}`]);
      set(`Remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => {
      const match = String(id).match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

export const recruitmentService = new RecruitmentService();
export const candidateService = new CandidateService();
export const salesService = new SalesService();
export const onboardService = new OnboardService();

export function getServiceForModule(module: HrmsModuleType) {
  switch (module) {
    case "recruitment": return recruitmentService;
    case "candidate": return candidateService;
    case "sales": return salesService;
    case "onboard": return onboardService;
  }
}

export async function getHrmsStepConfig(module: HrmsModuleType): Promise<HrmsStepConfig[]> {
  const cacheKey = `${GOOGLE_SHEET_ID}_${module}_step_config`;
  const cached = globalCache.get<HrmsStepConfig[]>(cacheKey);
  if (cached) return cached;

  const sheetNameMap = {
    recruitment: "Recruitment_Step Configuration",
    candidate: "Candidate_Step Configuration",
    sales: "Sales_Step Configuration",
    onboard: "Onboard_Step Configuration"
  };

  const sheets = await (recruitmentService as any).getSheetsClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetNameMap[module]}!A2:C`,
    });
    const defaults = DEFAULT_HRMS_STEPS[module];
    const data: HrmsStepConfig[] = [];
    const rowCount = Math.max(defaults.length, response.data.values?.length || 0);

    for (let i = 0; i < rowCount; i++) {
      const row = response.data.values?.[i] || [];
      data.push({
        step_name: row[0] || defaults[i] || `Step ${i + 1}`,
        tat: row[1] || "24 Hrs",
        responsible_person: row[2] || "",
      });
    }

    globalCache.set(cacheKey, data, 60 * 60 * 1000);
    return data;
  } catch (err) {
    console.error(`Error fetching config for ${module}:`, err);
    return [];
  }
}

export async function updateHrmsStepConfig(module: HrmsModuleType, configs: HrmsStepConfig[]): Promise<boolean> {
  const sheetNameMap = {
    recruitment: "Recruitment_Step Configuration",
    candidate: "Candidate_Step Configuration",
    sales: "Sales_Step Configuration",
    onboard: "Onboard_Step Configuration"
  };

  try {
    const sheets = await (recruitmentService as any).getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetNameMap[module]}!A2:C${configs.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: configs.map((c) => [c.step_name, c.tat, c.responsible_person]),
      },
    });
    globalCache.delete(`${GOOGLE_SHEET_ID}_${module}_step_config`);
    return true;
  } catch (error) {
    console.error(`Error updating step config for ${module}:`, error);
    return false;
  }
}

let hrmsLock: Promise<any> = Promise.resolve();

export async function addHrmsItem(module: HrmsModuleType, data: Partial<AnyHrmsRecord>): Promise<boolean> {
  return (hrmsLock = hrmsLock
    .then(async () => {
      const service = getServiceForModule(module);
      if (!data.id) {
        const prefixMap = {
          recruitment: "Recut-",
          candidate: "CNDID-",
          sales: "Sales-",
          onboard: "Onb-"
        };
        const num = await service.getNextNumericalId();
        const formattedNum = module === "candidate" ? String(num).padStart(3, "0") : num;
        data.id = `${prefixMap[module]}${formattedNum}`;
      }
      const now = new Date().toISOString();
      data.created_at = now;
      (data as any).updated_at = now;
      await service.ensureColumns((service as any).CANONICAL_HEADERS);
      return service.add(data as any);
    })
    .catch((err) => {
      console.error(`Error in addHrmsItem (${module}) lock:`, err);
      return false;
    }));
}

export async function updateHrmsItem(module: HrmsModuleType, id: string, data: AnyHrmsRecord): Promise<boolean> {
  const service = getServiceForModule(module);
  const now = new Date().toISOString();
  (data as any).updated_at = now;
  await service.ensureColumns((service as any).CANONICAL_HEADERS);
  return (service as any).update(id, data);
}

export async function deleteHrmsItem(module: HrmsModuleType, id: string): Promise<boolean> {
  const service = getServiceForModule(module);
  return service.delete(id);
}
