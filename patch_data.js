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
  if (filePath.endsWith('route.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes("from 'aws-amplify/api'")) {
      console.log('Patching api->data import in:', filePath);
      content = content.replace(/from ['"]aws-amplify\/api['"]/g, "from 'aws-amplify/data'");
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
console.log('API import patching complete.');
