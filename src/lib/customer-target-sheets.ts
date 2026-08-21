import { google } from "googleapis";
import { globalCache } from "@/lib/cache";
import {
  MONTH_NAMES,
  MonthName,
  MonthlyValues,
  PlannedParty,
  AchievementParty,
  SendLogEntry,
  CustomerTargetRow,
  PlannedInput,
  MessageType,
  SendStatus,
} from "@/types/customer-target";
import {
  normalizePartyKey,
  parseAmount,
  calcPending,
  calcAchievementPct,
  buildMessage,
  isValidMobile,
  isMonthName,
} from "@/lib/customer-target-messages";

const SPREADSHEET_ID = "1TbUv_iW_4AlBWGJqhYUOv_f6-OxPk3ha9qxSK7Y13L8";
const PLANNED_SHEET = "Sheet1";
const ACHIEVEMENT_SHEET = "Achievement";
const SEND_LOG_SHEET = "Send Log";

const PLANNED_HEADERS = ["Party Name", "Mobile Num", ...MONTH_NAMES];
const SEND_LOG_HEADERS = [
  "Id",
  "Timestamp",
  "Party Name",
  "Mobile",
  "Month",
  "Year",
  "Type",
  "Target",
  "Achieved",
  "Pending",
  "AchievementPct",
  "Status",
  "Error",
  "Sent By",
  "Message",
];

const CACHE_TTL = 30_000;

async function getSheetsClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );
  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);
  return google.sheets({ version: "v4", auth: oauth2Client });
}

function emptyMonths(): MonthlyValues {
  return MONTH_NAMES.reduce((acc, m) => {
    acc[m] = "";
    return acc;
  }, {} as MonthlyValues);
}

function parseMonthsFromRow(row: any[], startIdx = 2): MonthlyValues {
  const months = emptyMonths();
  MONTH_NAMES.forEach((month, i) => {
    const raw = row[startIdx + i];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      months[month] = "";
    } else {
      months[month] = parseAmount(raw);
    }
  });
  return months;
}

function monthsToRowValues(months?: Partial<MonthlyValues>): any[] {
  return MONTH_NAMES.map((m) => {
    const v = months?.[m];
    if (v === undefined || v === null || v === "") return "";
    return typeof v === "number" ? v : parseAmount(v) || "";
  });
}

function plannedToRow(party: { partyName: string; mobile: string; months?: Partial<MonthlyValues> }): any[] {
  return [party.partyName.trim(), String(party.mobile || "").trim(), ...monthsToRowValues(party.months)];
}

function clearCache(sheetName?: string) {
  if (sheetName) {
    globalCache.delete(`${SPREADSHEET_ID}_${sheetName}`);
  } else {
    globalCache.delete(`${SPREADSHEET_ID}_${PLANNED_SHEET}`);
    globalCache.delete(`${SPREADSHEET_ID}_${ACHIEVEMENT_SHEET}`);
    globalCache.delete(`${SPREADSHEET_ID}_${SEND_LOG_SHEET}`);
  }
}

async function getSheetIdByTitle(sheets: any, title: string): Promise<number | undefined> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return spreadsheet.data.sheets?.find((s: any) => s.properties?.title === title)?.properties?.sheetId;
}

async function ensureTab(title: string, headers: string[]) {
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = spreadsheet.data.sheets?.find((s: any) => s.properties?.title === title);

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${title}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    return;
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${title}'!1:1`,
  });
  const current = headerRes.data.values?.[0] || [];
  if (current.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${title}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
  }
}

export async function ensureCustomerTargetSheets() {
  await ensureTab(ACHIEVEMENT_SHEET, PLANNED_HEADERS);
  await ensureTab(SEND_LOG_SHEET, SEND_LOG_HEADERS);
}

async function readSheetRows(sheetName: string): Promise<any[][]> {
  const cacheKey = `${SPREADSHEET_ID}_${sheetName}`;
  const cached = globalCache.get<any[][]>(cacheKey);
  if (cached) return cached;

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:N`,
  });
  const rows = response.data.values || [];
  globalCache.set(cacheKey, rows, CACHE_TTL);
  return rows;
}

export async function getPlannedParties(): Promise<PlannedParty[]> {
  const rows = await readSheetRows(PLANNED_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row, idx) => ({
    rowNumber: idx + 2,
    partyName: String(row[0] || "").trim(),
    mobile: String(row[1] || "").trim(),
    months: parseMonthsFromRow(row, 2),
  })).filter((p) => p.partyName);
}

export async function getAchievementParties(): Promise<AchievementParty[]> {
  await ensureCustomerTargetSheets();
  const rows = await readSheetRows(ACHIEVEMENT_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row, idx) => ({
    rowNumber: idx + 2,
    partyName: String(row[0] || "").trim(),
    mobile: String(row[1] || "").trim(),
    months: parseMonthsFromRow(row, 2),
  })).filter((p) => p.partyName);
}

export async function getSendLogs(): Promise<SendLogEntry[]> {
  await ensureCustomerTargetSheets();
  const rows = await readSheetRows(SEND_LOG_SHEET);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row) => ({
    id: String(row[0] || ""),
    timestamp: String(row[1] || ""),
    partyName: String(row[2] || ""),
    mobile: String(row[3] || ""),
    month: (String(row[4] || "") as MonthName),
    year: Number(row[5]) || new Date().getFullYear(),
    type: (String(row[6] || "TARGET") as SendLogEntry["type"]),
    target: parseAmount(row[7]),
    achieved: parseAmount(row[8]),
    pending: parseAmount(row[9]),
    achievementPct: parseAmount(row[10]),
    status: (String(row[11] || "FAILED") as SendLogEntry["status"]),
    error: String(row[12] || ""),
    sentBy: String(row[13] || ""),
    message: String(row[14] || ""),
  }));
}

function latestSendStatus(
  logs: SendLogEntry[],
  partyName: string,
  month: MonthName,
  year: number,
  type: MessageType
): { status: SendStatus; error?: string } {
  const key = normalizePartyKey(partyName);
  const matches = logs.filter((l) => {
    if (normalizePartyKey(l.partyName) !== key || l.month !== month || l.year !== year) return false;
    if (l.type === type) return true;
    // Legacy logs used PLANNED before rename to TARGET
    if (type === "TARGET" && l.type === "PLANNED") return true;
    return false;
  });
  if (matches.length === 0) return { status: "NOT_SENT" };
  // Prefer the last chronologically; sheet order is append-only so last match wins
  const last = matches[matches.length - 1];
  return { status: last.status as SendStatus, error: last.error };
}

export async function getJoinedCustomerTargetRows(
  month: MonthName,
  type: MessageType,
  year = new Date().getFullYear()
): Promise<CustomerTargetRow[]> {
  if (!isMonthName(month)) throw new Error("Invalid month");
  await ensureCustomerTargetSheets();

  const [planned, achievement, logs] = await Promise.all([
    getPlannedParties(),
    getAchievementParties(),
    getSendLogs(),
  ]);

  const achievementByName = new Map(
    achievement.map((a) => [normalizePartyKey(a.partyName), a])
  );

  return planned.map((p) => {
    const ach = achievementByName.get(normalizePartyKey(p.partyName));
    const targetRaw = p.months[month];
    const achievedRaw = ach?.months[month];
    const target = typeof targetRaw === "number" ? targetRaw : parseAmount(targetRaw);
    const achieved = typeof achievedRaw === "number" ? achievedRaw : parseAmount(achievedRaw);
    const pending = calcPending(target, achieved);
    const achievementPct = calcAchievementPct(target, achieved);
    const { status, error } = latestSendStatus(logs, p.partyName, month, year, type);
    const preview = buildMessage(type, p.partyName, month, target, achieved, year);

    return {
      partyName: p.partyName,
      mobile: p.mobile || ach?.mobile || "",
      plannedRowNumber: p.rowNumber,
      achievementRowNumber: ach?.rowNumber ?? null,
      target,
      achieved,
      pending,
      achievementPct,
      sendStatus: status,
      lastError: error,
      preview,
    };
  });
}

export async function addPlannedParty(input: PlannedInput): Promise<boolean> {
  const sheets = await getSheetsClient();
  await ensureCustomerTargetSheets();

  const partyName = String(input.partyName || "").trim();
  if (!partyName) throw new Error("Party name is required");

  const existing = await getPlannedParties();
  if (existing.some((p) => normalizePartyKey(p.partyName) === normalizePartyKey(partyName))) {
    throw new Error("Party already exists");
  }

  const row = plannedToRow({
    partyName,
    mobile: input.mobile || "",
    months: input.months,
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PLANNED_SHEET}'!A:N`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // Mirror blank achievement row
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${ACHIEVEMENT_SHEET}'!A:N`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[partyName, String(input.mobile || "").trim(), ...monthsToRowValues({})]] },
  });

  clearCache();
  return true;
}

export async function updatePlannedParty(input: PlannedInput): Promise<boolean> {
  const sheets = await getSheetsClient();
  const originalName = String(input.originalPartyName || input.partyName || "").trim();
  const newName = String(input.partyName || "").trim();
  if (!originalName || !newName) throw new Error("Party name is required");

  const planned = await getPlannedParties();
  const target = planned.find((p) => normalizePartyKey(p.partyName) === normalizePartyKey(originalName));
  if (!target) throw new Error("Party not found");

  if (normalizePartyKey(originalName) !== normalizePartyKey(newName)) {
    const clash = planned.find((p) => normalizePartyKey(p.partyName) === normalizePartyKey(newName));
    if (clash) throw new Error("Another party already has this name");
  }

  const mergedMonths: MonthlyValues = { ...target.months };
  if (input.months) {
    for (const m of MONTH_NAMES) {
      const v = input.months[m];
      if (v === undefined || v === null || v === "") continue;
      mergedMonths[m] = typeof v === "number" ? v : parseAmount(v);
    }
  }
  const row = plannedToRow({
    partyName: newName,
    mobile: input.mobile ?? target.mobile,
    months: mergedMonths,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PLANNED_SHEET}'!A${target.rowNumber}:N${target.rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  // Sync achievement party name + mobile
  const achievement = await getAchievementParties();
  const ach = achievement.find((a) => normalizePartyKey(a.partyName) === normalizePartyKey(originalName));
  if (ach) {
    const achRow = [
      newName,
      String(input.mobile ?? target.mobile ?? ach.mobile).trim(),
      ...monthsToRowValues(ach.months),
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ACHIEVEMENT_SHEET}'!A${ach.rowNumber}:N${ach.rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [achRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${ACHIEVEMENT_SHEET}'!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[newName, String(input.mobile ?? target.mobile).trim(), ...monthsToRowValues({})]],
      },
    });
  }

  clearCache();
  return true;
}

export async function deletePlannedParty(partyName: string): Promise<boolean> {
  const sheets = await getSheetsClient();
  const name = String(partyName || "").trim();
  if (!name) throw new Error("Party name is required");

  const planned = await getPlannedParties();
  const target = planned.find((p) => normalizePartyKey(p.partyName) === normalizePartyKey(name));
  if (!target) throw new Error("Party not found");

  const plannedSheetId = await getSheetIdByTitle(sheets, PLANNED_SHEET);
  if (plannedSheetId === undefined) throw new Error("Sheet1 not found");

  const requests: any[] = [
    {
      deleteDimension: {
        range: {
          sheetId: plannedSheetId,
          dimension: "ROWS",
          startIndex: target.rowNumber - 1,
          endIndex: target.rowNumber,
        },
      },
    },
  ];

  const achievement = await getAchievementParties();
  const ach = achievement.find((a) => normalizePartyKey(a.partyName) === normalizePartyKey(name));
  if (ach) {
    const achSheetId = await getSheetIdByTitle(sheets, ACHIEVEMENT_SHEET);
    if (achSheetId !== undefined) {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: achSheetId,
            dimension: "ROWS",
            startIndex: ach.rowNumber - 1,
            endIndex: ach.rowNumber,
          },
        },
      });
    }
  }

  // Delete higher row indexes first if both sheets somehow same — they're different sheets so OK
  // But if both in same request and we delete planned first then achievement row numbers unchanged — good
  // If achievement rowNumber > planned and same sheet would matter — different sheets.

  // When deleting both, delete achievement first if we want to be safe on row numbers within same sheet - N/A
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  });

  clearCache();
  return true;
}

export async function importAchievementForMonth(
  month: MonthName,
  rows: { accountName: string; nettSaleAmt: number }[]
): Promise<{
  updated: number;
  unmatched: string[];
  matched: string[];
  zeroAmount: string[];
}> {
  if (!isMonthName(month)) throw new Error("Invalid month");
  await ensureCustomerTargetSheets();

  const sheets = await getSheetsClient();
  const planned = await getPlannedParties();
  const achievement = await getAchievementParties();

  const plannedByKey = new Map(planned.map((p) => [normalizePartyKey(p.partyName), p]));
  const achByKey = new Map(achievement.map((a) => [normalizePartyKey(a.partyName), a]));

  const monthColIndex = 2 + MONTH_NAMES.indexOf(month); // 0-based in row
  const colLetter = String.fromCharCode(65 + monthColIndex); // A=0 ... works for A-N

  const unmatched: string[] = [];
  const matched: string[] = [];
  const zeroAmount: string[] = [];
  let updated = 0;

  // Aggregate duplicate account names (sum)
  const aggregated = new Map<string, { displayName: string; amount: number }>();
  for (const r of rows) {
    const displayName = String(r.accountName || "").trim();
    if (!displayName) continue;
    const key = normalizePartyKey(displayName);
    const amount = parseAmount(r.nettSaleAmt);
    const prev = aggregated.get(key);
    if (prev) {
      prev.amount += amount;
    } else {
      aggregated.set(key, { displayName, amount });
    }
  }

  const dataUpdates: { range: string; values: any[][] }[] = [];

  for (const [key, { displayName, amount }] of aggregated.entries()) {
    const plannedParty = plannedByKey.get(key);
    if (!plannedParty) {
      unmatched.push(displayName);
      continue;
    }

    matched.push(plannedParty.partyName);
    if (amount === 0) zeroAmount.push(plannedParty.partyName);

    let ach = achByKey.get(key);
    if (!ach) {
      // Create achievement row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${ACHIEVEMENT_SHEET}'!A:N`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            plannedParty.partyName,
            plannedParty.mobile,
            ...MONTH_NAMES.map((m) => (m === month ? amount : "")),
          ]],
        },
      });
      updated++;
      continue;
    }

    dataUpdates.push({
      range: `'${ACHIEVEMENT_SHEET}'!${colLetter}${ach.rowNumber}`,
      values: [[amount]],
    });

    // Keep mobile in sync from planned
    dataUpdates.push({
      range: `'${ACHIEVEMENT_SHEET}'!A${ach.rowNumber}:B${ach.rowNumber}`,
      values: [[plannedParty.partyName, plannedParty.mobile]],
    });
    updated++;
  }

  if (dataUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: dataUpdates,
      },
    });
  }

  clearCache(ACHIEVEMENT_SHEET);
  return { updated, unmatched, matched, zeroAmount };
}

export async function appendSendLog(entry: Omit<SendLogEntry, "id"> & { id?: string }): Promise<void> {
  await ensureCustomerTargetSheets();
  const sheets = await getSheetsClient();
  const id = entry.id || `CT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SEND_LOG_SHEET}'!A:O`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        id,
        entry.timestamp,
        entry.partyName,
        entry.mobile,
        entry.month,
        entry.year,
        entry.type,
        entry.target,
        entry.achieved,
        entry.pending,
        entry.achievementPct,
        entry.status,
        entry.error,
        entry.sentBy,
        entry.message,
      ]],
    },
  });
  clearCache(SEND_LOG_SHEET);
}

export { SPREADSHEET_ID, PLANNED_SHEET, ACHIEVEMENT_SHEET, SEND_LOG_SHEET };
export { isValidMobile } from "@/lib/customer-target-messages";
