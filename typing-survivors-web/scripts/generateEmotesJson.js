const fs = require('fs');
const path = require('path');

const emotesDir = path.join(__dirname, '../public/emotes');
const files = fs.readdirSync(emotesDir).filter(file =>
  file.match(/\.(png|webp|gif)$/i)
);

fs.writeFileSync(
  path.join(emotesDir, 'emotes.json'),
  JSON.stringify(files, null, 2)
);

console.log('✅ emotes.json generated with', files.length, 'entries');
