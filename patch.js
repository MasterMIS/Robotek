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
    
    // If it uses generateClient or client.models but doesn't have Amplify.configure
    if ((content.includes('generateClient') || content.includes('aws-amplify/storage')) && !content.includes('Amplify.configure')) {
      
      console.log('Patching:', filePath);
      
      // Need to add imports:
      // import { Amplify } from 'aws-amplify';
      // import outputs from '@/../amplify_outputs.json';
      
      // Find the last import statement
      const importRegex = /import .+ from ['"].+['"];?\n/g;
      let lastMatch;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
         const insertPos = lastMatch.index + lastMatch[0].length;
         const importsToAdd = `import { Amplify } from 'aws-amplify';\nimport outputs from '@/../amplify_outputs.json';\n\nAmplify.configure(outputs);\n`;
         content = content.slice(0, insertPos) + importsToAdd + content.slice(insertPos);
         fs.writeFileSync(filePath, content, 'utf8');
      } else {
         // No imports? Just stick it at the top
         const importsToAdd = `import { Amplify } from 'aws-amplify';\nimport outputs from '@/../amplify_outputs.json';\n\nAmplify.configure(outputs);\n`;
         content = importsToAdd + content;
         fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
});
console.log('Patching complete.');
