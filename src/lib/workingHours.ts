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
