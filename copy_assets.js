const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Dell\\.gemini\\antigravity-ide\\brain\\1cd10b82-f63e-4689-b9f9-feb08d120943';
const destDir = 'e:\\Personal Projects\\pravabloy ai\\pravabloyai\\assets\\images';

const files = [
  { src: 'coach_celebrating_1783356228370.png', dest: 'coach-celebrating.png' },
  { src: 'coach_explaining_1783356253057.png', dest: 'coach-explaining.png' },
  { src: 'coach_resting_1783356263380.png', dest: 'coach-resting.png' }
];

files.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);
  try {
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${f.src} to ${f.dest}`);
    } else {
      console.error(`Source file not found: ${srcPath}`);
    }
  } catch (err) {
    console.error(`Failed to copy ${f.src}:`, err.message);
  }
});
