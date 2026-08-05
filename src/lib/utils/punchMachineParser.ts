export interface ParsedPunchRecord {
  userCode: string;
  userNameFromFile: string;
  date: string;
  inTime: string;
  outTime: string;
}

export interface PunchParseResult {
  records: ParsedPunchRecord[];
  warnings: string[];
  employeeCount: number;
  monthHint: string | null;
}

const USER_CODE_PATTERN = /^RE\d+$/i;

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function cellValue(row: unknown[] | undefined, index: number): string {
  const value = row?.[index];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseExcelSerialDate(serial: number): Date | null {
  if (serial > 40000 && serial < 60000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseDateValue(raw: string): string | null {
  if (!raw) return null;

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && raw.match(/^\d+(\.\d+)?$/)) {
    const serialDate = parseExcelSerialDate(numeric);
    if (serialDate) {
      return serialDate.toISOString().split("T")[0];
    }
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const dashMatch = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (dashMatch) {
    const [, dd, mon, yyyy] = dashMatch;
    const monthIndex = MONTH_MAP[mon.toLowerCase()];
    if (monthIndex !== undefined) {
      return `${yyyy}-${String(monthIndex + 1).padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function parseTimeValue(raw: string): string | null {
  if (!raw) return null;

  const numeric = Number(raw);
  if (!Number.isNaN(numeric) && numeric >= 0 && numeric < 1) {
    const totalMinutes = Math.round(numeric * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch) {
    const [, hh, mm] = timeMatch;
    return `${String(Number(hh)).padStart(2, "0")}:${mm}`;
  }

  return null;
}

function findLabeledRow(rows: unknown[][], start: number, end: number, label: string): unknown[] | null {
  for (let i = start; i <= end && i < rows.length; i++) {
    const row = rows[i];
    if (normalizeLabel(cellValue(row, 0)) === normalizeLabel(label)) {
      return row;
    }
  }
  return null;
}

function isUserCode(value: string): boolean {
  return USER_CODE_PATTERN.test(value.trim());
}

export function parsePunchMachineSheet(rows: unknown[][]): PunchParseResult {
  const records: ParsedPunchRecord[] = [];
  const warnings: string[] = [];
  const employeeCodes = new Set<string>();
  const monthCounts = new Map<string, number>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const userCode = cellValue(row, 3);
    if (!isUserCode(userCode)) continue;

    const userNameFromFile = cellValue(row, 1);
    employeeCodes.add(userCode.toUpperCase());

    const blockEnd = Math.min(rowIndex + 12, rows.length - 1);
    const dateRow = rows[rowIndex + 1];
    if (!dateRow) {
      warnings.push(`Missing date row for employee ${userCode}.`);
      continue;
    }

    const inTimeRow =
      findLabeledRow(rows, rowIndex + 1, blockEnd, "In Time") || rows[rowIndex + 2];
    const outTimeRow =
      findLabeledRow(rows, rowIndex + 1, blockEnd, "Out Time") || rows[rowIndex + 3];

    if (!inTimeRow || !outTimeRow) {
      warnings.push(`Missing in/out rows for employee ${userCode}.`);
      continue;
    }

    for (let col = 2; col < dateRow.length; col++) {
      const rawDate = cellValue(dateRow, col);
      if (!rawDate) continue;

      const date = parseDateValue(rawDate);
      if (!date) {
        warnings.push(`Could not parse date "${rawDate}" for ${userCode}.`);
        continue;
      }

      const inTime = parseTimeValue(cellValue(inTimeRow, col)) || "";
      const outTime = parseTimeValue(cellValue(outTimeRow, col)) || "";

      if (!inTime && !outTime) continue;

      const monthKey = date.slice(0, 7);
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);

      records.push({
        userCode: userCode.toUpperCase(),
        userNameFromFile,
        date,
        inTime,
        outTime,
      });
    }
  }

  let monthHint: string | null = null;
  if (monthCounts.size > 0) {
    monthHint = Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  if (employeeCodes.size === 0) {
    warnings.push("No employee blocks found. Expected user codes like RE005 in column D.");
  }

  return {
    records,
    warnings,
    employeeCount: employeeCodes.size,
    monthHint,
  };
}

export function buildIstIsoTimestamp(dateYmd: string, timeHm: string): string {
  const [year, month, day] = dateYmd.split("-").map(Number);
  const [hours, minutes] = timeHm.split(":").map(Number);
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0) - istOffsetMs;
  return new Date(utcMs).toISOString();
}
