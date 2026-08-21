const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const src = path.join(from, element);
    const dest = path.join(to, element);
    if (fs.lstatSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    } else {
      copyFolderSync(src, dest);
    }
  });
}

const distPath = path.join(__dirname, '../frontend/dist');
const rootPath = path.join(__dirname, '..');

if (fs.existsSync(distPath)) {
  copyFolderSync(distPath, rootPath);
  console.log('[BUILD] Frontend dist copied to repository root successfully.');
}
