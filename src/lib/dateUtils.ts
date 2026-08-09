export function parseDateString(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  if (dateStr.includes("/")) {
    const parts = dateStr.split(" ");
    const dateParts = parts[0].split("/");
    if (dateParts.length === 3) {
      const [day, month, year] = dateParts;
      const timePart = parts[1] || "00:00:00";
      return new Date(`${year}-${month}-${day}T${timePart}`);
    }
  }
  return null;
}

export function parseSheetDate(val: any): string | null {
  if (!val) return null;
  const d = parseDateString(String(val));
  return d ? d.toISOString() : null;
}

export function getIstDateString(): string {
  // Returns ISO date string adjusted for IST context (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return istNow.toISOString().split('T')[0];
}

/** Sunday check for YYYY-MM-DD (calendar date, not timezone-shifted clock). */
export function isSundayDateString(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  return new Date(y, m - 1, d).getDay() === 0;
}

export function isKbOffice(office?: string): boolean {
  return String(office || '').trim().toUpperCase() === 'KB';
}

/** KB branch: Monday off. All other offices: Sunday off. */
export function getWeeklyOffDayOfWeek(office?: string): 0 | 1 {
  return isKbOffice(office) ? 1 : 0;
}

export function getWeeklyOffLabel(office?: string): 'SUN' | 'MON' {
  return getWeeklyOffDayOfWeek(office) === 1 ? 'MON' : 'SUN';
}

export function isWeeklyOffForUser(
  office: string | undefined,
  year: number,
  month: number,
  day: number
): boolean {
  return new Date(year, month, day).getDay() === getWeeklyOffDayOfWeek(office);
}

export function isWeeklyOffDateString(office: string | undefined, dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  return isWeeklyOffForUser(office, y, m - 1, d);
}

export function isWeeklyOffIstToday(office?: string): boolean {
  return isWeeklyOffDateString(office, getIstDateString());
}

export function isSundayIstToday(): boolean {
  return isSundayDateString(getIstDateString());
}

export function isSundayInMonth(year: number, month: number, day: number): boolean {
  return new Date(year, month, day).getDay() === 0;
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatDateMMM(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
