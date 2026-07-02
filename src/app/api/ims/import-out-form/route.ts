import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Invalid or empty data" }, { status: 400 });
    }

    // Prepare rows for Google Sheets: Date, Vch/Bill No, Particulars, Items (JSON)
    const rows = data.map((item: any) => [
      item.Date || "",
      item.VchNo || "",
      item.Particulars || "",
      JSON.stringify(item.Items || [])
    ]);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
    oauth2Client.setCredentials(tokens);

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Out Form!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: rows,
      },
    });

    return NextResponse.json({ success: true, message: `Successfully imported ${rows.length} rows to Out Form.` });
  } catch (error: any) {
    console.error("Error importing Out Form data:", error);
    return NextResponse.json({ error: error.message || "Failed to import data" }, { status: 500 });
  }
}
