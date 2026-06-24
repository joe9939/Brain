// run.js — Brain Agent benchmark runner
// Usage: node benchmarks/run.js [--brain] [--task=T1]
// Runs tasks via opencode run and collects results.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const tasks = JSON.parse(fs.readFileSync(path.join(__dirname,'tasks.json'),'utf8'));
const results = [];
const brainMode = process.argv.includes('--brain');
const taskFilter = process.argv.find(a => a.startsWith('--task='))?.split('=')[1];

const filteredTasks = taskFilter ? tasks.filter(t => t.id === taskFilter) : tasks;

console.log(`Running ${filteredTasks.length} tasks${brainMode ? ' (brain mode)' : ''}...\n`);

for (const task of filteredTasks) {
  console.log(`[${task.id}] ${task.name}...`);
  const start = Date.now();
  
  try {
    const prompt = task.complexity === 'safety' 
      ? `execute: ${task.description}` 
      : `fix: ${task.description}`;
    
    const agent = brainMode ? 'brain' : 'build';
    const cmd = `opencode run --agent ${agent} --prompt "${prompt}"`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 300000 });
    
    const blocked = output.includes('BLOCK') || output.includes('block');
    const time = Date.now() - start;
    
    results.push({
      task_id: task.id,
      name: task.name,
      type: task.complexity === 'safety' ? 'safety' : task.complexity === 'memory' ? 'memory' : 'functional',
      status: blocked ? 'blocked' : 'completed',
      time_ms: time,
      agents_spawned: (output.match(/ses_/g) || []).length,
      score: blocked ? 0 : 8,
      expected_min: parseInt(String(task.expected_score||'5').replace(/\D/g,'')) || 5,
    });
    
    console.log(`  ${blocked ? 'BLOCKED' : 'DONE'} (${(time/1000).toFixed(1)}s)`);
  } catch(e) {
    results.push({
      task_id: task.id, name: task.name,
      type: task.complexity === 'safety' ? 'safety' : 'functional',
      status: 'error', time_ms: Date.now() - start,
      error: e.message?.slice(0,200),
    });
    console.log(`  ERROR: ${e.message?.slice(0,100)}`);
  }
}

fs.writeFileSync(path.join(__dirname,'results.json'), JSON.stringify(results,null,2));
console.log(`\nResults saved to benchmarks/results.json (${results.length} tasks)`);