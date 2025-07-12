const fs = require('fs');
const path = require('path');

const soundFolders = ['background', 'game-over', 'enemy-death'];
const baseDir = path.join(__dirname, '..', 'public', 'sounds');

soundFolders.forEach(folder => {
  const folderPath = path.join(baseDir, folder);

  if (!fs.existsSync(folderPath)) {
    console.warn(`Folder not found: ${folderPath}`);
    return;
  }

  const files = fs.readdirSync(folderPath)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      // Filter common audio extensions
      return ['.mp3'].includes(ext);
    });

  const jsonPath = path.join(folderPath, 'list.json');
  fs.writeFileSync(jsonPath, JSON.stringify(files, null, 2), 'utf-8');

  console.log(`Generated ${jsonPath} with ${files.length} files.`);
});