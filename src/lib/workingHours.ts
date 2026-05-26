export function getWorkingHoursGapMs(start: Date, end: Date): number {
  if (start >= end) return 0;

  let totalMs = 0;

  const getISTDateStr = (d: Date) => {
    const dIST = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return dIST.toISOString().split('T')[0];
  };

  const getISTBounds = (dateStr: string) => {
    // 9:30 AM IST = 04:00:00 UTC
    // 6:30 PM IST = 13:00:00 UTC
    const wStart = new Date(`${dateStr}T04:00:00.000Z`);
    const wEnd = new Date(`${dateStr}T13:00:00.000Z`);
    return { wStart, wEnd };
  };

  const startISTStr = getISTDateStr(start);
  const endISTStr = getISTDateStr(end);

  if (startISTStr === endISTStr) {
    const { wStart, wEnd } = getISTBounds(startISTStr);
    const actualStart = new Date(Math.max(start.getTime(), wStart.getTime()));
    const actualEnd = new Date(Math.min(end.getTime(), wEnd.getTime()));
    if (actualStart < actualEnd) {
      totalMs += actualEnd.getTime() - actualStart.getTime();
    }
    return totalMs;
  }

  let currentISTStr = startISTStr;
  let safety = 0;
  while (currentISTStr <= endISTStr && safety < 10000) {
    safety++;
    const { wStart, wEnd } = getISTBounds(currentISTStr);
    
    let actualStart = wStart;
    let actualEnd = wEnd;
    
    if (currentISTStr === startISTStr) {
      actualStart = new Date(Math.max(start.getTime(), wStart.getTime()));
    }
    
    if (currentISTStr === endISTStr) {
      actualEnd = new Date(Math.min(end.getTime(), wEnd.getTime()));
    }
    
    if (actualStart < actualEnd) {
      totalMs += actualEnd.getTime() - actualStart.getTime();
    }
    
    const nextDay = new Date(wStart.getTime() + 24 * 60 * 60 * 1000);
    const nextDayIST = new Date(nextDay.getTime() + 5.5 * 60 * 60 * 1000);
    currentISTStr = nextDayIST.toISOString().split('T')[0];
  }
  
  return totalMs;
}

/**
 * Calculates the planned time by adding working hours to a base date.
 * Skips Sundays and only counts hours between 9:30 AM and 6:30 PM IST.
 */
export function calculatePlannedTimeIST(baseDateUTC: Date, workingHoursToAdd: number): Date {
  // Convert UTC to IST so we can use standard Date UTC methods to manipulate "local" time easily
  let dateIST = new Date(baseDateUTC.getTime() + 5.5 * 60 * 60 * 1000);
  
  let minsToAdd = workingHoursToAdd * 60;
  let safety = 0;
  
  while (minsToAdd > 0 && safety < 10000) {
    safety++;
    if (dateIST.getUTCDay() === 0) { // Sunday
      dateIST.setUTCDate(dateIST.getUTCDate() + 1);
      dateIST.setUTCHours(9, 30, 0, 0);
      continue;
    }
    
    let curHour = dateIST.getUTCHours() + dateIST.getUTCMinutes() / 60;
    
    if (curHour >= 18.5) { // 6:30 PM IST
      dateIST.setUTCDate(dateIST.getUTCDate() + 1);
      dateIST.setUTCHours(9, 30, 0, 0);
      continue;
    }
    
    if (curHour < 9.5) { // 9:30 AM IST
      dateIST.setUTCHours(9, 30, 0, 0);
      curHour = 9.5;
    }
    
    let availMins = (18.5 - curHour) * 60;
    if (minsToAdd <= availMins) {
      dateIST.setUTCMinutes(dateIST.getUTCMinutes() + minsToAdd);
      minsToAdd = 0;
    } else {
      minsToAdd -= availMins;
      dateIST.setUTCDate(dateIST.getUTCDate() + 1);
      dateIST.setUTCHours(9, 30, 0, 0);
    }
  }
  
  // Convert back to UTC
  return new Date(dateIST.getTime() - 5.5 * 60 * 60 * 1000);
}
