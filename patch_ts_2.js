const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// 1. Fix Attendance route (remove created_at and updated_at)
const attendanceRoute = path.join(srcDir, 'app', 'api', 'attendance', 'route.ts');
if (fs.existsSync(attendanceRoute)) {
  let c = fs.readFileSync(attendanceRoute, 'utf8');
  c = c.replace(/created_at: timeStr,/g, '');
  c = c.replace(/updated_at: timeStr/g, ''); // leaves a trailing comma
  fs.writeFileSync(attendanceRoute, c, 'utf8');
}

// 2. Fix EA-MD Debug route (duplicate status property)
const eamdDebugRoute = path.join(srcDir, 'app', 'api', 'ea-md', 'debug', 'route.ts');
if (fs.existsSync(eamdDebugRoute)) {
  let c = fs.readFileSync(eamdDebugRoute, 'utf8');
  // Remove `status: error.status,` line
  c = c.replace(/status: error\.status,/g, '');
  fs.writeFileSync(eamdDebugRoute, c, 'utf8');
}

// 3. Fix migrate-data route (ChatService does not exist, use messageService)
const migrateRoute = path.join(srcDir, 'app', 'api', 'migrate-data', 'route.ts');
if (fs.existsSync(migrateRoute)) {
  let c = fs.readFileSync(migrateRoute, 'utf8');
  c = c.replace(/const { ChatService } = await import\("@\/lib\/chat-sheets"\);/g, 'const { messageService } = await import("@/lib/chat-sheets");');
  // We cannot call .getAll() on undefined if chatService was a class. Here messageService is an instance.
  c = c.replace(/const chatService = new \(ChatService as any\)\(\);/g, '');
  c = c.replace(/await chatService\.getAll\?\.\(\)/g, 'await messageService.getAll()');
  fs.writeFileSync(migrateRoute, c, 'utf8');
}

// 4. Fix O2D route (missing type for 'f', missing 'uploadData')
const o2dRoute = path.join(srcDir, 'app', 'api', 'o2d', 'route.ts');
if (fs.existsSync(o2dRoute)) {
  let c = fs.readFileSync(o2dRoute, 'utf8');
  c = c.replace(/f => orderMatchesDateFilter/g, '(f: any) => orderMatchesDateFilter');
  // Add back uploadData since the POST route still uses it for order_screenshot!
  // It should be imported from aws-amplify/storage.
  if(!c.includes('uploadData') && c.includes('uploadData({')) {
      c = c.replace(/import { getUrl } from 'aws-amplify\/storage';/g, "import { getUrl, uploadData } from 'aws-amplify/storage';");
  }
  fs.writeFileSync(o2dRoute, c, 'utf8');
}

// 5. Fix UI Modals
const eaMdPage = path.join(srcDir, 'app', '(dashboard)', 'ea-md', 'page.tsx');
if (fs.existsSync(eaMdPage)) {
  let c = fs.readFileSync(eaMdPage, 'utf8');
  // If ActionStatusModal takes onAction instead of onClose, or if trailing onClose doesn't exist
  // We notice 'onClose={...}' is used on line 260. ActionStatusModal normally auto-closes or expects onAction
  // Let me replace `onClose={() => setActionStatus(null)}` to `onAction={() => setActionStatus(null)}`
  c = c.replace(/onClose=\{/g, 'onAction=\{');
  fs.writeFileSync(eaMdPage, c, 'utf8');
}

const imsPage = path.join(srcDir, 'app', '(dashboard)', 'ims', 'page.tsx');
if (fs.existsSync(imsPage)) {
  let c = fs.readFileSync(imsPage, 'utf8');
  c = c.replace(/onCancel=\{/g, 'onClose=\{');
  fs.writeFileSync(imsPage, c, 'utf8');
}

console.log("Secondary TS patches completed.");
