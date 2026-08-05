import { buildIstIsoTimestamp, parsePunchMachineSheet } from "./punchMachineParser";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const sampleRows: unknown[][] = [
  ["", "", "Monthly Attendance Report"],
  [],
  ["", "SHIV KUMAR", "", "RE005"],
  ["", "", "01-Jul-2026", "02-Jul-2026", "03-Jul-2026"],
  ["In Time", "", "14:11", "14:21", ""],
  ["Out Time", "", "18:36", "18:40", ""],
  ["Working Hours"],
  ["Over Time"],
  ["Status", "", "P", "P", "A"],
  ["Late Arrival"],
  [],
  ["", "PREM PRAKASH", "", "RE012"],
  ["", "", "01-Jul-2026", "02-Jul-2026"],
  ["In Time", "", "09:05", "09:10"],
  ["Out Time", "", "18:00", "18:15"],
  ["Working Hours"],
  ["Over Time"],
  ["Status", "", "P", "P"],
  ["Late Arrival"],
  [],
  ["", "UNKNOWN USER", "", "RE999"],
  ["", "", "01-Jul-2026"],
  ["In Time", "", "10:00"],
  ["Out Time", "", "18:00"],
];

const parsed = parsePunchMachineSheet(sampleRows);

assert(parsed.employeeCount === 3, "Expected 3 employees");
assert(parsed.records.length === 5, `Expected 5 records, got ${parsed.records.length}`);
assert(parsed.records[0].userCode === "RE005", "First user code should be RE005");
assert(parsed.records[0].date === "2026-07-01", "First date should be 2026-07-01");
assert(parsed.records[0].inTime === "14:11", "First in time should be 14:11");
assert(parsed.records[0].outTime === "18:36", "First out time should be 18:36");
assert(parsed.monthHint === "2026-07", "Month hint should be July 2026");

const iso = buildIstIsoTimestamp("2026-07-02", "14:21");
assert(iso.includes("2026-07-02"), "ISO timestamp should preserve date");

console.log("punchMachineParser tests passed");
