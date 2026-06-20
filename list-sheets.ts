import { getSheetsClient } from "./src/lib/sheet-utils";

async function main() {
  const SCOT_SPREADSHEET_ID = "1DUWUB_vySOgV3gWg_Vsz-jt4Ws_B4SBSj1pIfhqEfh0";
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SCOT_SPREADSHEET_ID,
  });
  const sheetNames = res.data.sheets?.map(s => s.properties?.title);
  console.log("Sheets available:", sheetNames);
}

main().catch(console.error);
