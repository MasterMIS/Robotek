require('dotenv').config({ path: '.env.local' });
const { followUpService } = require('./src/lib/sales-sheets.ts');
require('ts-node').register();
const { getFollowUps } = require('./src/lib/sales-sheets.ts');

async function run() {
  const all = await getFollowUps('L-004');
  console.log(JSON.stringify(all, null, 2));
}
run();
