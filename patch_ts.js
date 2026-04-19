const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const apiDir = path.join(__dirname, 'src', 'app', 'api');

walkDir(apiDir, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    if (content.includes('IMSRecord')) {
      content = content.replace(/IMSRecord/g, 'IMSItem');
      modified = true;
    }
    if (content.includes('PartyRecord')) {
      content = content.replace(/PartyRecord/g, 'Party');
      modified = true;
    }
    if (content.includes('SchedulerMeeting')) {
      content = content.replace(/SchedulerMeeting/g, 'Meeting');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});

console.log("Model names patched successfully.");

// Let's also patch the specific ticket history route that causes typescript strict errors:
const historyRoute = path.join(apiDir, 'tickets', '[id]', 'history', 'route.ts');
if (fs.existsSync(historyRoute)) {
  let content = fs.readFileSync(historyRoute, 'utf8');
  // Replaces createdHistory. with createdHistory?. to avoid 'Object is possibly null' error
  if (content.includes('createdHistory.')) {
    content = content.replace(/createdHistory\./g, 'createdHistory?.');
    fs.writeFileSync(historyRoute, content, 'utf8');
    console.log("Patched tickets history route.");
  }
}
