import { google } from "googleapis";

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

async function checkSheets() {
  const spreadsheetId = "170_kSzQKoO5N7euODaLz1kaJVXN7QRlRqHdnBn0kdos";
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId });
    console.log("Sheet names:", res.data.sheets?.map(s => s.properties?.title));
  } catch (err) {
    console.error("Error:", err);
  }
}

checkSheets();
