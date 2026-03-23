import { google } from "googleapis";
import { O2D } from "@/types/o2d";

const GOOGLE_SHEET_ID = "1T0vSzAgHoO21DifCUcPMRLR4yOy-kFteJ2bv6pG-UTc";
const SHEET_NAME = "O2D";

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

export async function getO2Ds(): Promise<O2D[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      order_no: row[1] || "",
      party_name: row[2] || "",
      item_name: row[3] || "",
      item_qty: row[4] || "",
      est_amount: row[5] || "",
      remark: row[6] || "",
      order_screenshot: row[7] || "",
      filled_by: row[8] || "",
      created_at: row[9] || "",
      updated_at: row[10] || "",
    }));
  } catch (error) {
    console.error("Error fetching O2Ds from Google Sheets:", error);
    return [];
  }
}

export async function addO2D(o2d: O2D): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          o2d.id,
          o2d.order_no,
          o2d.party_name,
          o2d.item_name,
          o2d.item_qty,
          o2d.est_amount,
          o2d.remark,
          o2d.order_screenshot,
          o2d.filled_by,
          o2d.created_at,
          o2d.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding O2D to Google Sheets:", error);
    return false;
  }
}

export async function addO2Ds(o2ds: O2D[]): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: o2ds.map(o2d => [
          o2d.id,
          o2d.order_no,
          o2d.party_name,
          o2d.item_name,
          o2d.item_qty,
          o2d.est_amount,
          o2d.remark,
          o2d.order_screenshot,
          o2d.filled_by,
          o2d.created_at,
          o2d.updated_at
        ]),
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding O2Ds to Google Sheets:", error);
    return false;
  }
}

export async function updateO2D(id: string, o2d: O2D): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:K${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          o2d.id,
          o2d.order_no,
          o2d.party_name,
          o2d.item_name,
          o2d.item_qty,
          o2d.est_amount,
          o2d.remark,
          o2d.order_screenshot,
          o2d.filled_by,
          o2d.created_at,
          o2d.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating O2D in Google Sheets:", error);
    return false;
  }
}

export async function deleteO2D(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => String(row[0]) === String(id));
    if (rowIndex === -1) return false;

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;

    if (sheetId === undefined) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      }
    });

    return true;
  } catch (error) {
    console.error("Error deleting O2D from Google Sheets:", error);
    return false;
  }
}

export async function deleteOrderByNo(orderNo: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!B:B`,
    });

    const rows = response.data.values;
    if (!rows) return false;

    // Find all row indices for this order_no (1-indexed for sheet ranges)
    const indicesToDelete = rows
      .map((row, index) => (row[0] === orderNo ? index : -1))
      .filter(index => index !== -1)
      .sort((a, b) => b - a); // Sort descending to not break indices when deleting

    if (indicesToDelete.length === 0) return false;

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SHEET_ID });
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;

    if (sheetId === undefined) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: indicesToDelete.map(index => ({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: index,
              endIndex: index + 1
            }
          }
        }))
      }
    });

    return true;
  } catch (error) {
    console.error("Error deleting order from Google Sheets:", error);
    return false;
  }
}

export async function updateOrder(orderNo: string, o2ds: O2D[]): Promise<boolean> {
  try {
    // Delete existing rows for this order first
    await deleteOrderByNo(orderNo);
    // Then add the new items as a batch
    return await addO2Ds(o2ds);
  } catch (error) {
    console.error("Error updating order in Google Sheets:", error);
    return false;
  }
}

export interface O2DDetails {
  parties: string[];
  items: { name: string; amount: string }[];
}

export async function getO2DDetails(): Promise<O2DDetails> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `Details!A2:C`,
    });

    const rows = response.data.values;
    if (!rows) return { parties: [], items: [] };

    const parties = Array.from(new Set(rows.map(row => row[0]).filter(Boolean)));
    const items = rows.map(row => ({
      name: row[1] || "",
      amount: row[2] || ""
    })).filter(item => item.name);

    return { parties, items };
  } catch (error) {
    console.error("Error fetching O2D details from Google Sheets:", error);
    return { parties: [], items: [] };
  }
}
