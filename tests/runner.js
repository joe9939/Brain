#!/usr/bin/env node
// runner.js — Unified test runner for brain-agent test framework
// Usage: node tests/runner.js [--unit] [--integration] [--e2e] [--circuits] [--qc] [--benchmarks] [--all] [--dangerous]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;

const CATEGORIES = [
  { flag: '--unit', dir: 'unit', label: 'UNIT' },
  { flag: '--mcp', dir: 'mcp', label: 'MCP' },
  { flag: '--integration', dir: 'integration', label: 'INTEGRATION' },
  { flag: '--e2e', dir: 'e2e', label: 'E2E' },
  { flag: '--tracer', dir: 'tracer', label: 'TRACER' },
  { flag: '--circuits', dir: 'circuits', label: 'CIRCUITS' },
  { flag: '--bc', dir: 'behavioral', label: 'BEHAVIORAL' },
  { flag: '--plugin', dir: 'plugin', label: 'PLUGIN' },
  { flag: '--qc', dir: 'qc', label: 'QC' },
  { flag: '--benchmarks', dir: '../benchmarks', label: 'BENCHMARKS' },
];

function shouldRun(flag) {
  if (process.argv.includes('--all')) return true;
  return process.argv.includes(flag);
}

function loadTests(category) {
  const dir = path.join(ROOT, category.dir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.test.js') || f.endsWith('.bench.js'))
    .sort()
    .map(f => {
      if (f.endsWith('.bench.js')) {
        return { name: f.replace('.bench.js', ''), run: null, file: f, isBench: true };
      }
      const mod = require(path.join(dir, f));
      return { name: mod.name || f.replace('.test.js', ''), run: mod.run, file: f, isBench: false };
    });
}

function pad(s, len) { while (s.length < len) s += ' '; return s; }

async function runTest(category, test) {
  const start = Date.now();
  if (test.isBench) {
    const dir = path.join(ROOT, category.dir);
    const result = spawnSync('node', [path.join(dir, test.file)], { encoding: 'utf8', timeout: 30000 });
    const elapsed = Date.now() - start;
    if (result.status === 0) {
      try {
        const data = JSON.parse(result.stdout.trim());
        const status = data.pass ? 'PASS' : 'FAIL';
        const display = '[' + category.label + '] ' + pad(test.name, 40) + '... ' + status + ' (' + elapsed + 'ms)';
        console.log(display);
        if (data.message) console.log('  ' + data.message);
        return { name: test.name, passed: !!data.pass, message: data.message || 'benchmark completed', time_ms: elapsed, status, metrics: data.metrics };
      } catch (e) {
        const display = '[' + category.label + '] ' + pad(test.name, 40) + '... FAIL (' + elapsed + 'ms)';
        console.log(display);
        console.log('  stdout: ' + result.stdout.trim().slice(0, 200));
        if (result.stderr) console.log('  stderr: ' + result.stderr.slice(0, 200));
        return { name: test.name, passed: false, message: 'JSON parse failed: ' + e.message, time_ms: elapsed, status: 'FAIL' };
      }
    } else {
      const display = '[' + category.label + '] ' + pad(test.name, 40) + '... FAIL (' + elapsed + 'ms)';
      console.log(display);
      console.log('  ' + (result.stderr || 'exit code ' + result.status).slice(0, 200));
      return { name: test.name, passed: false, message: result.stderr || 'exit code ' + result.status, time_ms: elapsed, status: 'FAIL' };
    }
  }
  try {
    const result = await test.run();
    const elapsed = Date.now() - start;
    const status = result.passed ? 'PASS' : 'FAIL';
    const display = '[' + category.label + '] ' + pad(test.name, 40) + '... ' + status + ' (' + elapsed + 'ms)';
    console.log(display);
    return { name: test.name, passed: result.passed, message: result.message, time_ms: elapsed, status };
  } catch (e) {
    const elapsed = Date.now() - start;
    const display = '[' + category.label + '] ' + pad(test.name, 40) + '... FAIL (' + elapsed + 'ms)';
    console.log(display);
    return { name: test.name, passed: false, message: e.message, time_ms: elapsed, status: 'FAIL' };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: node tests/runner.js [--unit] [--integration] [--e2e] [--circuits] [--plugin] [--qc] [--benchmarks] [--all] [--dangerous]');
    console.log('  --all         Run all test categories');
    console.log('  --dangerous   Include dangerous tests (real install/uninstall)');
    process.exit(0);
  }

  const allResults = [];

  for (const cat of CATEGORIES) {
    if (!shouldRun(cat.flag)) continue;
    const tests = loadTests(cat);
    if (tests.length === 0) {
      console.log('[' + cat.label + '] No tests found in ' + cat.dir + '/');
      continue;
    }
    console.log('\n=== ' + cat.label + ' (' + tests.length + ' tests) ===\n');
    for (const test of tests) {
      const result = await runTest(cat, test);
      allResults.push(result);
    }
  }

  const total = allResults.length;
  const pass = allResults.filter(r => r.passed).length;
  const fail = total - pass;

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:  PASS: ' + pass + ',  FAIL: ' + fail + ',  TOTAL: ' + total);
  console.log('='.repeat(50) + '\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Runner error:', e);
  process.exit(1);
});
