const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md', 'utf8');
let idx = 0, count = 0;
const lines = c.split('\n');
for (let l = 0; l < lines.length; l++) {
  if (lines[l].includes('```')) {
    count++;
    console.log('Line', l+1, ':', lines[l].trim());
  }
}
