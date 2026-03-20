import { google } from "googleapis";
import { Checklist } from "@/types/checklist";

const GOOGLE_SHEET_ID = "1kqX1fWoTyk2Y7IUCpO5PrrcF0fvGSj0n3xZaNdmm3Iw";
const SHEET_NAME = "checklists";

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

export async function getChecklists(): Promise<Checklist[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:O`,
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      task: row[1] || "",
      assigned_by: row[2] || "",
      assigned_to: row[3] || "",
      priority: row[4] || "",
      department: row[5] || "",
      verification_required: row[6] || "",
      verifier_name: row[7] || "",
      attachment_required: row[8] || "",
      frequency: row[9] || "",
      due_date: row[10] || "",
      status: row[11] || "",
      group_id: row[12] || "",
      created_at: row[13] || "",
      updated_at: row[14] || "",
    }));
  } catch (error) {
    console.error("Error fetching checklists from Google Sheets:", error);
    return [];
  }
}

export async function addChecklist(checklist: Checklist): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:O`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          checklist.id,
          checklist.task,
          checklist.assigned_by,
          checklist.assigned_to,
          checklist.priority,
          checklist.department,
          checklist.verification_required,
          checklist.verifier_name,
          checklist.attachment_required,
          checklist.frequency,
          checklist.due_date,
          checklist.status,
          checklist.group_id,
          checklist.created_at,
          checklist.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding checklist to Google Sheets:", error);
    return false;
  }
}

export async function updateChecklist(id: string, checklist: Checklist): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const rows = response.data.values;
    if (!rows) {
      console.error("No rows found in sheet for matching");
      return false;
    }

    const searchId = String(id).trim();
    const searchIdNum = parseInt(searchId);
    
    const rowIndex = rows.findIndex(row => {
      if (!row[0]) return false;
      const cellValue = String(row[0]).trim();
      if (cellValue === searchId) return true;
      if (cellValue === `#${searchId}`) return true;
      if (!isNaN(searchIdNum) && (cellValue === searchIdNum.toString() || cellValue === `${searchIdNum}.00`)) return true;
      return false;
    });
    
    if (rowIndex === -1) {
      console.error(`ID ${searchId} not found in sheet. Rows:`, rows.length);
      throw new Error(`Checklist ID ${searchId} not found in spreadsheet.`);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex + 1}:O${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          String(checklist.id),
          checklist.task,
          checklist.assigned_by,
          checklist.assigned_to,
          checklist.priority,
          checklist.department,
          checklist.verification_required,
          checklist.verifier_name,
          checklist.attachment_required,
          checklist.frequency,
          checklist.due_date,
          checklist.status,
          checklist.group_id,
          checklist.created_at,
          checklist.updated_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error updating checklist in Google Sheets:", error);
    return false;
  }
}

export async function deleteChecklist(id: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    
    const rows = response.data.values;
    if (!rows) {
      console.error("No rows found in sheet for matching");
      throw new Error("No data found in spreadsheet.");
    }

    const searchId = String(id).trim();
    const searchIdNum = parseInt(searchId);
    
    const rowIndex = rows.findIndex(row => {
      if (!row[0]) return false;
      const cellValue = String(row[0]).trim();
      if (cellValue === searchId) return true;
      if (cellValue === `#${searchId}`) return true;
      if (!isNaN(searchIdNum) && (cellValue === searchIdNum.toString() || cellValue === `${searchIdNum}.00`)) return true;
      return false;
    });

    if (rowIndex === -1) {
      console.error(`ID ${searchId} not found in sheet for deletion. Rows:`, rows.length);
      throw new Error(`Checklist ID ${searchId} not found in spreadsheet.`);
    }
    
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID
    });
    
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
    
    if (sheetId === undefined) {
      console.error(`Sheet with name ${SHEET_NAME} not found.`);
      return false;
    }
    
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
    console.error("Error deleting checklist from Google Sheets:", error);
    return false;
  }
}
