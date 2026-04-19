const fs = require('fs');
const path = require('path');

// 1. Fix amplify/backend.ts
const backendTs = path.join(__dirname, 'amplify', 'backend.ts');
if (fs.existsSync(backendTs)) {
  let c = fs.readFileSync(backendTs, 'utf8');
  c = c.replace(/resource\.ts/g, 'resource');
  fs.writeFileSync(backendTs, c, 'utf8');
  console.log("Fixed amplify/backend.ts");
}

// 2. Fix IMS page.tsx
const imsPage = path.join(__dirname, 'src', 'app', '(dashboard)', 'ims', 'page.tsx');
if (fs.existsSync(imsPage)) {
  let c = fs.readFileSync(imsPage, 'utf8');
  // Remove onClose from ActionStatusModal
  c = c.replace(/<ActionStatusModal\s+isOpen=\{isActionModalOpen\}\s+status=\{actionStatus\}\s+message=\{actionMessage\}\s+onClose=\{[^}]+\}\s*\/>/g, '<ActionStatusModal isOpen={isActionModalOpen} status={actionStatus} message={actionMessage} />');
  
  // Add title="Confirm" to ConfirmModal if missing
  // It looks like: <ConfirmModal isOpen={isCancelModalOpen} message="Cancel this?" onConfirm={handleCancelOrder} onClose={() => setIsCancelModalOpen(false)} />
  // I will just use regex to insert title="Confirm" before isOpen
  if (c.includes('<ConfirmModal') && !c.includes('title=')) {
      c = c.replace(/<ConfirmModal/g, '<ConfirmModal title="Confirm"');
  }
  fs.writeFileSync(imsPage, c, 'utf8');
  console.log("Fixed IMS page.tsx");
}

// 3. Delete debug.ts
const debugTs = path.join(__dirname, 'src', 'app', 'api', 'ea-md', 'debug.ts');
if (fs.existsSync(debugTs)) {
  fs.unlinkSync(debugTs);
  console.log("Deleted debug.ts");
}

// 4. Fix O2D route.ts uploadData import
const o2dRoute = path.join(__dirname, 'src', 'app', 'api', 'o2d', 'route.ts');
if (fs.existsSync(o2dRoute)) {
  let c = fs.readFileSync(o2dRoute, 'utf8');
  if (c.includes("import { getUrl } from 'aws-amplify/storage';")) {
      c = c.replace(/import { getUrl } from 'aws-amplify\/storage';/, "import { getUrl, uploadData } from 'aws-amplify/storage';");
      fs.writeFileSync(o2dRoute, c, 'utf8');
      console.log("Fixed O2D route.ts uploadData import");
  } else if (!c.includes('uploadData') && c.includes('@aws-amplify/storage')) {
      console.log("Needs manual review for O2D route!");
  }
}
