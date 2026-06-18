const fs = require('fs');
const path = 'src/app/(dashboard)/leave/page.tsx';
const lines = fs.readFileSync(path,'utf8').split('\n');
let net=0;
for(let i=0;i<lines.length;i++){
  const l=lines[i];
  const opens = (l.match(new RegExp('<div\\\b','g'))||[]).length;
  const closes = (l.match(new RegExp('</div>','g'))||[]).length;
  net += opens-closes;
  if((i+1)%20===0) console.log('line', i+1, 'net', net);
}
console.log('final net', net);
