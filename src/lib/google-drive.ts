import { google } from "googleapis";
import { Readable } from "stream";
import { getDriveImageUrl } from "./drive-utils";

const IMAGE_FOLDER_ID = "1WJiXLo7XVy8YDoSN1pNPCRatGzDA7yb9";

async function getDriveClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL
  );

  const tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKENS || "{}");
  oauth2Client.setCredentials(tokens);

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function uploadFileToDrive(file: File, folderId?: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    
    // Convert File to Buffer then to Readable Stream
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: `${Date.now()}-${file.name}`,
      parents: [folderId || IMAGE_FOLDER_ID],
    };

    const media = {
      mimeType: file.type,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;
    if (!fileId) return null;

    // Set permission to anyone with the link can view
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Return the direct download link or webViewLink
    // Note: To display directly in <img>, we often use a proxy or the webContentLink
    return fileId; 
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    return null;
  }
}

export async function uploadBase64ToDrive(base64Data: string, folderId?: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    
    // Extract mime type and base64 string
    const match = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      console.error("Invalid base64 string format");
      return null;
    }
    const mimeType = match[1];
    const base64Str = match[2];

    const buffer = Buffer.from(base64Str, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: `attendance-${Date.now()}.${mimeType.split('/')[1]}`,
      parents: [folderId || IMAGE_FOLDER_ID],
    };

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
    });

    const fileId = response.data.id;
    if (!fileId) return null;

    // Set permission to anyone with the link can view
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return fileId; // Return file ID
  } catch (error) {
    console.error("Error uploading base64 to Google Drive:", error);
    return null;
  }
}

export async function getFileStream(fileId: string) {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get(
      { fileId: fileId, alt: "media" },
      { responseType: "stream" }
    );
    
    // Also get metadata for MIME type
    const metadata = await drive.files.get({
      fileId: fileId,
      fields: "mimeType, size, name"
    });

    return {
      stream: response.data,
      mimeType: metadata.data.mimeType,
      size: metadata.data.size,
      name: metadata.data.name
    };
  } catch (error) {
    console.error("Error getting file stream from Drive:", error);
    return null;
  }
}

export { getDriveImageUrl };
