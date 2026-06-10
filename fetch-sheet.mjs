import { google } from "googleapis";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";

async function run() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
    oauth2Client.setCredentials(tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    
    // Check sheet contents
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Out Form!A:H`,
    });
    console.log(response.data.values);
  } catch(e) {
    console.error("ERROR", e);
  }
}

run();
