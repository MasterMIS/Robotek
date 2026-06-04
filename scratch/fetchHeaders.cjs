const { google } = require('googleapis');
const path = require('path');

const credentialsPath = path.resolve('C:/Users/maste/Client Project/Robotek/credentials.json');
const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function run() {
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1q00QfCvnk69ZHXZ9ZPPHXXLDBDfSAfqk20MK15xqOVk',
    range: 'Recruitment!A1:ZZ1',
  });
  console.log(JSON.stringify(res.data.values[0]));
}
run().catch(console.error);
