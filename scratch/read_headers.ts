import { google } from "googleapis";
import path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), "service-account.json"),
    scopes: SCOPES,
  });
  return auth.getClient();
}

async function run() {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: authClient as any });
  
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: "12lk8GV7ZBpm6J-bA5TBWfHQ1qY0eEHIrwOICSnsuceE",
      range: "IMS-1st Floor!A1:Z1",
    });
    console.log("IMS-1st Floor headers:", res.data.values?.[0]);

    const res2 = await sheets.spreadsheets.values.get({
      spreadsheetId: "12lk8GV7ZBpm6J-bA5TBWfHQ1qY0eEHIrwOICSnsuceE",
      range: "IMS-G Floor!A1:Z1",
    });
    console.log("IMS-G Floor headers:", res2.data.values?.[0]);
  } catch (e: any) {
    console.error(e.message);
  }
}

run();
