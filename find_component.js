const fs = require('fs');
const path = require('path');

const searchDirs = [
  'c:\\groundcorporation\\GroundCorporation_web\\frontend\\app',
  'c:\\groundcorporation\\GroundCorporation_web\\frontend\\components'
];
const queries = ['관련', 'V.O.G', '테크니컬', 'Related', 'technical'];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      queries.forEach(query => {
        if (content.includes(query)) {
          console.log(`Match for "${query}" found in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, index) => {
            if (line.includes(query)) {
              console.log(`  Line ${index + 1}: ${line.trim()}`);
            }
          });
        }
      });
    }
  });
}

searchDirs.forEach(scanDir);
