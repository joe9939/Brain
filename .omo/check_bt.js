const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\86189\\Desktop\\brain-agent\\.opencode\\skills\\brain-master.md', 'utf8');
let count = 0, i = 0;
while ((i = c.indexOf('```', i)) >= 0) { count++; i += 3; }
console.log('Backtick count:', count, 'Even:', count % 2 === 0);
