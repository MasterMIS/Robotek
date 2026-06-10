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
    
    // Check sheet names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    console.log("Sheets:", spreadsheet.data.sheets.map(s => s.properties.title));

    // Try appending
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Out Form!A:H`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["TEST", "TEST", "TEST", "TEST", "TEST", "TEST", "TEST", "TEST"]],
      },
    });
    console.log("Appended!", res.status);
  } catch(e) {
    console.error("ERROR", e);
  }
}

run();
