/**
 * Client-safe utilities for Google Drive.
 * This file should NOT import any Node.js specific libraries or googleapis.
 */

export function getDriveImageUrl(fileId: string) {
  if (!fileId) return "";
  // Use the thumbnail endpoint which is much more reliable for direct embedding
  return `https://drive.google.com/thumbnail?sz=w400&id=${fileId}`;
}
