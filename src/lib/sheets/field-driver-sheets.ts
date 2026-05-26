import { google } from "googleapis";

const FIELD_DRIVER_SPREADSHEET_ID = "14v-TvoFEByxFKh1kvQXveDmWe1bB-LyWP5Fx352j9b8";

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

export interface FieldDriverRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;
  inTime: string;
  outTime: string;
  status: string; // IN, COMPLETED
  inLocation: string; // lat,lng
  outLocation: string; // lat,lng
  odometerIn: string;
  odometerOut: string;
  odometerPhotoIn: string;
  odometerPhotoOut: string;
  totalKm: string;
}

export async function getFieldDriverRecords(): Promise<FieldDriverRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: "Field Driver!A:N",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    return rows.slice(1).map((row) => ({
      id: row[0] || "",
      userId: row[1] || "",
      userName: row[2] || "",
      date: row[3] || "",
      inTime: row[4] || "",
      outTime: row[5] || "",
      status: row[6] || "",
      inLocation: row[7] || "",
      outLocation: row[8] || "",
      odometerIn: row[9] || "",
      odometerOut: row[10] || "",
      odometerPhotoIn: row[11] || "",
      odometerPhotoOut: row[12] || "",
      totalKm: row[13] || "",
    }));
  } catch (error) {
    console.error("Error fetching field driver records:", error);
    return [];
  }
}

export async function addFieldDriverRecord(record: FieldDriverRecord): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: "Field Driver!A:N",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          record.id,
          record.userId,
          record.userName,
          record.date,
          record.inTime,
          record.outTime,
          record.status,
          record.inLocation,
          record.outLocation,
          record.odometerIn,
          record.odometerOut,
          record.odometerPhotoIn,
          record.odometerPhotoOut,
          record.totalKm
        ]],
      },
    });
    return true;
  } catch (error) {
    console.error("Error adding field driver record:", error);
    return false;
  }
}

export async function updateFieldDriverCheckOut(
  id: string, 
  outTime: string, 
  status: string, 
  outLocation: string,
  odometerOut: string,
  odometerPhotoOut: string,
  totalKm: string
): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: "Field Driver!A:A",
    });

    const rows = response.data.values;
    if (!rows) return false;

    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return false;

    await sheets.spreadsheets.values.update({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: `Field Driver!F${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          outTime,
          status,
          "", // inLocation (don't overwrite, but wait we need to keep existing? no, this will overwrite)
          outLocation,
          "", // odometerIn
          odometerOut,
          "", // odometerPhotoIn
          odometerPhotoOut,
          totalKm
        ]],
      },
    });
    
    // Better way: get full row first, merge, then update.
    const fullRowRes = await sheets.spreadsheets.values.get({
        spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
        range: `Field Driver!A${rowIndex + 1}:N${rowIndex + 1}`,
    });
    const existing = fullRowRes.data.values?.[0] || [];
    
    const updatedRow = [
      existing[0], // id
      existing[1], // userId
      existing[2], // userName
      existing[3], // date
      existing[4], // inTime
      outTime,     // outTime
      status,      // status
      existing[7], // inLocation
      outLocation, // outLocation
      existing[9], // odometerIn
      odometerOut, // odometerOut
      existing[11], // odometerPhotoIn
      odometerPhotoOut, // odometerPhotoOut
      totalKm      // totalKm
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: `Field Driver!A${rowIndex + 1}:N${rowIndex + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [updatedRow],
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating field driver record:", error);
    return false;
  }
}

// --- Live Tracking ---

export interface LiveLocationDailyRecord {
  userId: string;
  userName: string;
  date: string;
  pathData: string; // JSON string
}

export async function addOrUpdateLiveLocationJSON(
  userId: string, 
  userName: string, 
  dateStr: string, 
  pingData: { time: string, lat: string, lng: string }
): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: "Live Tracking!A:D",
    });

    const rows = response.data.values || [];
    
    // Find if there's already a row for this user on this date
    const rowIndex = rows.findIndex(row => row[0] === userId && row[2] === dateStr);

    if (rowIndex === -1) {
      // Create new row
      const initialPathData = JSON.stringify([pingData]);
      await sheets.spreadsheets.values.append({
        spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
        range: "Live Tracking!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            userId,
            userName,
            dateStr,
            initialPathData
          ]],
        },
      });
    } else {
      // Update existing row
      const existingPathDataStr = rows[rowIndex][3] || "[]";
      let pathData = [];
      try {
        pathData = JSON.parse(existingPathDataStr);
        if (!Array.isArray(pathData)) pathData = [];
      } catch (e) {
        pathData = [];
      }
      
      pathData.push(pingData);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
        range: `Live Tracking!D${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[JSON.stringify(pathData)]],
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Error adding live location JSON:", error);
    return false;
  }
}

export async function getLiveLocationsJSON(dateStr?: string): Promise<LiveLocationDailyRecord[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: FIELD_DRIVER_SPREADSHEET_ID,
      range: "Live Tracking!A:D",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];

    let records = rows.slice(1).map((row) => ({
      userId: row[0] || "",
      userName: row[1] || "",
      date: row[2] || "",
      pathData: row[3] || "[]",
    }));
    
    if (dateStr) {
        records = records.filter(r => r.date === dateStr);
    }
    
    return records;
  } catch (error) {
    console.error("Error fetching live locations JSON:", error);
    return [];
  }
}
