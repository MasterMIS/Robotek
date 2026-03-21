import { google } from "googleapis";
import { Checklist, ChecklistRevision, ChecklistRemark } from "@/types/checklist";

const GOOGLE_SHEET_ID = "1RG5I4QET9WLjKmSeGCzsbmgraMDH-HXZHfWcOprPBA0";
const SHEET_NAME = "checklists";
const REVISION_SHEET = "checklists_revision_history";
const REMARK_SHEET = "checklists_remarks";

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
      range: `${SHEET_NAME}!A:N`,
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
      attachment_required: row[7] || "",
      frequency: row[8] || "",
      due_date: row[9] || "",
      status: row[10] || "",
      group_id: row[11] || "",
      created_at: row[12] || "",
      updated_at: row[13] || "",
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
      range: `${SHEET_NAME}!A:N`,
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
      range: `${SHEET_NAME}!A${rowIndex + 1}:N${rowIndex + 1}`,
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

export async function updateChecklistByGroup(groupId: string, data: Checklist): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // Fetch all columns to get group_id (Column L, index 11)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:N`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.error("No rows found in sheet for group update matching");
      return false;
    }

    // Find all indices that match the groupId
    const updates: { range: string, values: any[][] }[] = [];
    
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[11] === groupId) {
        // Prepare the new row data. 
        // We preserve ID (A), Frequency (I), and Due Date (J) from the original row.
        const updatedRow = [
          row[0], // id
          data.task,
          data.assigned_by,
          data.assigned_to,
          data.priority,
          data.department,
          data.verification_required,
          data.attachment_required,
          row[8], // frequency (keep original)
          row[9], // due_date (keep original)
          data.status,
          row[11], // group_id
          row[12], // created_at
          data.updated_at
        ];
        
        updates.push({
          range: `${SHEET_NAME}!A${index + 1}:N${index + 1}`,
          values: [updatedRow]
        });
      }
    });

    if (updates.length === 0) {
      console.error(`No rows found with group_id ${groupId} for update`);
      return false;
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: updates
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error updating checklist group:", error);
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

export async function deleteChecklistByGroup(groupId: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    
    // Fetch all columns to get group_id (Column L, index 11)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A:L`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.error("No rows found in sheet for group matching");
      return false;
    }

    // Find all indices that match the groupId
    const rowIndicesToDelete: number[] = [];
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      if (row[11] === groupId) {
        rowIndicesToDelete.push(index);
      }
    });

    if (rowIndicesToDelete.length === 0) {
      console.error(`No rows found with group_id ${groupId}`);
      return false;
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SHEET_ID
    });
    
    const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId;
    
    if (sheetId === undefined) return false;

    // Delete rows in reverse order to maintain correct indices
    const requests = rowIndicesToDelete
      .sort((a, b) => b - a)
      .map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: { requests }
    });
    
    return true;
  } catch (error) {
    console.error("Error deleting checklist group:", error);
    return false;
  }
}

export async function addChecklistRevision(revision: ChecklistRevision): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REVISION_SHEET}!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          revision.id,
          revision.checklists_id,
          revision.old_status,
          revision.new_status,
          revision.reason,
          revision.created_at,
          revision.evidence_urls
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding checklist revision history:", error);
    return false;
  }
}

export async function addChecklistRemark(remark: ChecklistRemark): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REMARK_SHEET}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          remark.id,
          remark.checklists_id,
          remark.user_id,
          remark.username,
          remark.remark,
          remark.created_at
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding checklist remark:", error);
    return false;
  }
}

export async function getChecklistHistory(checklistId: string): Promise<any[]> {
  try {
    const sheets = await getSheetsClient();
    
    // Fetch revisions
    const revResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REVISION_SHEET}!A:G`,
    });
    
    // Fetch remarks
    const remResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${REMARK_SHEET}!A:F`,
    });
 
    const revRows = revResponse.data.values || [];
    const remRows = remResponse.data.values || [];
 
    const history: any[] = [];
 
    // Parse revisions
    if (revRows.length > 1) {
      revRows.slice(1).forEach(row => {
        if (String(row[1]) === String(checklistId)) {
          history.push({
            type: 'revision',
            id: row[0],
            old_status: row[2],
            new_status: row[3],
            reason: row[4],
            created_at: row[5],
            evidence_urls: row[6]
          });
        }
      });
    }
 
    // Parse remarks
    if (remRows.length > 1) {
      remRows.slice(1).forEach(row => {
        if (String(row[1]) === String(checklistId)) {
          history.push({
            type: 'remark',
            id: row[0],
            user_id: row[2],
            username: row[3],
            remark: row[4],
            created_at: row[5]
          });
        }
      });
    }
 
    // Sort by date latest to oldest
    return history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error("Error fetching checklist history:", error);
    return [];
  }
}
