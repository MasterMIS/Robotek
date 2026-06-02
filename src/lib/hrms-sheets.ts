import { BaseSheetsService } from "./sheets/base-service";
import { Recruitment, Candidate, Sales, Onboard, HrmsStepConfig, HrmsModuleType, AnyHrmsRecord } from "@/types/hrms";
import { globalCache } from "./cache";

const GOOGLE_SHEET_ID = "1q00QfCvnk69ZHXZ9ZPPHXXLDBDfSAfqk20MK15xqOVk";

class RecruitmentService extends BaseSheetsService<Recruitment> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Recruitment";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "id", "post_for_recruitment", "no._of_post_for_recruitment", "for_which_location", "urgency", "male_/female", 
    "age_group", "qualifications", "skills_required", "experience_needed_for_the_role", "work_and__responsibilities", 
    "planned_ctc", "requirement_by", "created_at", "cancelled",
    "planned_1", "actual_1", "social_medias", "remark_1",
    "planned_2", "actual_2", "status_2", "remark_2",
    "planned_3", "actual_3", "status_3", "remark_3",
    "planned_4", "actual_4", "status_4", "remark_4",
    "planned_5", "actual_5", "status_5", "remark_5"
  ];

  mapRowToItem(row: any[]): Recruitment {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("id"),
      post_for_recruitment: get("post_for_recruitment"),
      no_of_post_for_recruitment: get("no._of_post_for_recruitment"),
      for_which_location: get("for_which_location"),
      urgency: get("urgency"),
      male_female: get("male_/female"),
      age_group: get("age_group"),
      qualifications: get("qualifications"),
      skills_required: get("skills_required"),
      experience_needed_for_the_role: get("experience_needed_for_the_role"),
      work_and_responsibilities: get("work_and__responsibilities"),
      planned_ctc: get("planned_ctc"),
      requirement_by: get("requirement_by"),
      created_at: get("created_at"),
      cancelled: get("cancelled"),
      social_medias: get("social_medias"),
    };
    for (let i = 1; i <= 5; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`actual_${i}`] = get(`actual_${i}`);
      item[`remark_${i}`] = get(`remark_${i}`);
      if (i > 1) item[`status_${i}`] = get(`status_${i}`);
    }
    return item as Recruitment;
  }

  mapItemToRow(item: Recruitment): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("post_for_recruitment", item.post_for_recruitment);
    set("no._of_post_for_recruitment", item.no_of_post_for_recruitment);
    set("for_which_location", item.for_which_location);
    set("urgency", item.urgency);
    set("male_/female", item.male_female);
    set("age_group", item.age_group);
    set("qualifications", item.qualifications);
    set("skills_required", item.skills_required);
    set("experience_needed_for_the_role", item.experience_needed_for_the_role);
    set("work_and__responsibilities", item.work_and_responsibilities);
    set("planned_ctc", item.planned_ctc);
    set("requirement_by", item.requirement_by);
    set("created_at", item.created_at);
    set("cancelled", item.cancelled);
    set("social_medias", item.social_medias);

    for (let i = 1; i <= 5; i++) {
      set(`planned_${i}`, (item as any)[`planned_${i}`]);
      set(`actual_${i}`, (item as any)[`actual_${i}`]);
      set(`remark_${i}`, (item as any)[`remark_${i}`]);
      if (i > 1) set(`status_${i}`, (item as any)[`status_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class CandidateService extends BaseSheetsService<Candidate> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Candidate";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_(in_days)", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "created_at", "cancelled",
    "planned_1", "actual_1", "status_1", "remark_1",
    "planned_2", "actual_2", "status_2", "remark_2",
    "planned_3", "actual_3", "status_3", "remark_3",
    "planned_4", "actual_4", "status_4", "remark_4",
    "planned_5", "actual_5", "status_5", "remark_5",
    "planned_6", "actual_6", "status_6", "remark_6",
    "planned_7", "actual_7", "status_7", "remark_7", "lead_time_for_emp._joining_7"
  ];

  mapRowToItem(row: any[]): Candidate {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_(in_days)"),
      reason_for_quit: get("reason_for_quit"),
      share_two_professional_references: get("share_two_professional_references"),
      current_living_location: get("current_living_location"),
      upload_updated_cv: get("upload_updated_cv"),
      whatsapp_number: get("whatsapp_number"),
      gtk_office_comfortable: get("gtk_office_comfortable"),
      slot_booking: get("slot_booking"),
      remark: get("remark"),
      created_at: get("created_at"),
      cancelled: get("cancelled"),
      lead_time_for_emp_joining_7: get("lead_time_for_emp._joining_7")
    };
    for (let i = 1; i <= 7; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`actual_${i}`] = get(`actual_${i}`);
      item[`status_${i}`] = get(`status_${i}`);
      item[`remark_${i}`] = get(`remark_${i}`);
    }
    return item as Candidate;
  }

  mapItemToRow(item: Candidate): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_(in_days)", item.notice_period_in_days);
    set("reason_for_quit", item.reason_for_quit);
    set("share_two_professional_references", item.share_two_professional_references);
    set("current_living_location", item.current_living_location);
    set("upload_updated_cv", item.upload_updated_cv);
    set("whatsapp_number", item.whatsapp_number);
    set("gtk_office_comfortable", item.gtk_office_comfortable);
    set("slot_booking", item.slot_booking);
    set("remark", item.remark);
    set("created_at", item.created_at);
    set("cancelled", item.cancelled);
    set("lead_time_for_emp._joining_7", item.lead_time_for_emp_joining_7);

    for (let i = 1; i <= 7; i++) {
      set(`planned_${i}`, (item as any)[`planned_${i}`]);
      set(`actual_${i}`, (item as any)[`actual_${i}`]);
      set(`status_${i}`, (item as any)[`status_${i}`]);
      set(`remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class SalesService extends BaseSheetsService<Sales> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Sales";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_(in_days)", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "lead_time", "created_at", "cancelled",
    "planned_1", "actual_1", "status_1", "remark_1",
    "planned_2", "actual_2", "status_2", "remark_2",
    "planned_3", "actual_3", "status_3", "remark_3",
    "planned_4", "actual_4", "status_4", "remark_4",
    "planned_5", "actual_5", "status_5", "remark_5",
    "planned_6", "actual_6", "status_6", "remark_6",
    "planned_7", "actual_7", "status_7", "remark_7",
    "planned_8", "actual_8", "status_8", "remark_8"
  ];

  mapRowToItem(row: any[]): Sales {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_(in_days)"),
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
      cancelled: get("cancelled"),
    };
    for (let i = 1; i <= 8; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`actual_${i}`] = get(`actual_${i}`);
      item[`status_${i}`] = get(`status_${i}`);
      item[`remark_${i}`] = get(`remark_${i}`);
    }
    return item as Sales;
  }

  mapItemToRow(item: Sales): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_(in_days)", item.notice_period_in_days);
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
    set("cancelled", item.cancelled);

    for (let i = 1; i <= 8; i++) {
      set(`planned_${i}`, (item as any)[`planned_${i}`]);
      set(`actual_${i}`, (item as any)[`actual_${i}`]);
      set(`status_${i}`, (item as any)[`status_${i}`]);
      set(`remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
    return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
  }
}

class OnboardService extends BaseSheetsService<Onboard> {
  protected spreadsheetId = GOOGLE_SHEET_ID;
  protected sheetName = "Onboard";
  protected range = "A:ZZ";
  protected idColumnIndex = 0;

  public readonly CANONICAL_HEADERS = [
    "id", "candidate_name", "date_of_birth", "applied_for", "total_experience", "current_ctc", "expected_ctc", 
    "notice_period_(in_days)", "reason_for_quit", "share_two_professional_references", "current_living_location", 
    "upload_updated_cv", "whatsapp_number", "gtk_office_comfortable", "slot_booking", "remark", "lead_time", "created_at", "cancelled",
    "planned_1", "actual_1", "status_1", "remark_1",
    "planned_2", "actual_2", "status_2", "remark_2",
    "planned_3", "actual_3", "status_3", "remark_3",
    "planned_4", "actual_4", "status_4", "remark_4",
    "planned_5", "actual_5", "status_5", "remark_5",
    "planned_6", "actual_6", "status_6", "remark_6",
    "planned_7", "actual_7", "status_7", "remark_7",
    "planned_8", "actual_8", "status_8", "remark_8",
    "planned_9", "actual_9", "status_9", "remark_9",
    "planned_10", "actual_10", "status_10", "remark_10",
    "planned_11", "actual_11", "status_11", "remark_11"
  ];

  mapRowToItem(row: any[]): Onboard {
    const get = (h: string) => row[this.hMap[h.toLowerCase()]] ?? "";
    const item: any = {
      id: get("id"),
      candidate_name: get("candidate_name"),
      date_of_birth: get("date_of_birth"),
      applied_for: get("applied_for"),
      total_experience: get("total_experience"),
      current_ctc: get("current_ctc"),
      expected_ctc: get("expected_ctc"),
      notice_period_in_days: get("notice_period_(in_days)"),
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
      cancelled: get("cancelled"),
    };
    for (let i = 1; i <= 11; i++) {
      item[`planned_${i}`] = get(`planned_${i}`);
      item[`actual_${i}`] = get(`actual_${i}`);
      item[`status_${i}`] = get(`status_${i}`);
      item[`remark_${i}`] = get(`remark_${i}`);
    }
    return item as Onboard;
  }

  mapItemToRow(item: Onboard): any[] {
    const row: any[] = Array(this.CANONICAL_HEADERS.length).fill("");
    const set = (h: string, val: any) => {
      const idx = this.hMap[h.toLowerCase()];
      if (idx !== undefined) row[idx] = val ?? "";
    };

    set("id", item.id);
    set("candidate_name", item.candidate_name);
    set("date_of_birth", item.date_of_birth);
    set("applied_for", item.applied_for);
    set("total_experience", item.total_experience);
    set("current_ctc", item.current_ctc);
    set("expected_ctc", item.expected_ctc);
    set("notice_period_(in_days)", item.notice_period_in_days);
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
    set("cancelled", item.cancelled);

    for (let i = 1; i <= 11; i++) {
      set(`planned_${i}`, (item as any)[`planned_${i}`]);
      set(`actual_${i}`, (item as any)[`actual_${i}`]);
      set(`status_${i}`, (item as any)[`status_${i}`]);
      set(`remark_${i}`, (item as any)[`remark_${i}`]);
    }

    return row;
  }

  async getNextNumericalId(): Promise<number> {
    const ids = await this.getLatestIds();
    const numericIds = ids.map((id) => parseInt(String(id)) || 0);
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
    const data: HrmsStepConfig[] = response.data.values?.map((row: any[]) => ({
      step_name: row[0] || "",
      tat: row[1] || "",
      responsible_person: row[2] || "",
    })) || [];

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
        data.id = (await service.getNextNumericalId()).toString();
      }
      const now = new Date().toISOString();
      data.created_at = now;
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
  await service.ensureColumns((service as any).CANONICAL_HEADERS);
  return (service as any).update(id, data);
}

export async function deleteHrmsItem(module: HrmsModuleType, id: string): Promise<boolean> {
  const service = getServiceForModule(module);
  return service.delete(id);
}
