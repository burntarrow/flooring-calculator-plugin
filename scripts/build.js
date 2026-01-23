const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'flooring-calculator.jsx');
const destPath = path.join(__dirname, '..', 'assets', 'flooring-calculator.js');

if (!fs.existsSync(srcPath)) {
  console.error(`Source file not found: ${srcPath}`);
  process.exit(1);
}

fs.copyFileSync(srcPath, destPath);
console.log(`Copied ${srcPath} -> ${destPath}`);
