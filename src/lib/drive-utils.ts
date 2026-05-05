/**
 * Client-safe utilities for Google Drive.
 * This file should NOT import any Node.js specific libraries or googleapis.
 */

export function extractDriveId(path: string | null | undefined): string {
  if (!path) return "";
  if (!path.includes("drive.google.com")) return path;
  
  // Try to match /file/d/ID/ or /d/ID/ or ?id=ID
  const match = path.match(/\/d\/(.+?)(\/|$|\?)/) || path.match(/[?&]id=(.+?)(&|$)/);
  return match ? match[1] : path;
}

export function getDriveImageUrl(path: string | null | undefined) {
  const fileId = extractDriveId(path);
  if (!fileId) return "";
  // Use the thumbnail endpoint which is much more reliable for direct embedding
  return `https://drive.google.com/thumbnail?sz=w400&id=${fileId}`;
}

export function getDriveDownloadUrl(path: string | null | undefined) {
  const fileId = extractDriveId(path);
  if (!fileId) return "";
  // Direct download link
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function getDrivePreviewUrl(path: string | null | undefined) {
  const fileId = extractDriveId(path);
  if (!fileId) return "";
  // Standard Google Drive preview page
  return `https://drive.google.com/file/d/${fileId}/view`;
}
