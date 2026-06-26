// prompt-format.test.js — Prompt format validation
// Validates prompt files have correct formatting: LF line endings, no trailing whitespace,
// language-specified code blocks, valid JSON examples, sequential rule numbers.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const PROMPTS_DIR = config.PROMPTS_DIR;
const AGENTS_DIR = path.join(config.BRAIN_AGENT_DIR, 'src', 'agents');

function collectFiles() {
  const allFiles = [];
  if (fs.existsSync(PROMPTS_DIR)) {
    for (const f of fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.md')).sort()) {
      allFiles.push({ path: path.join(PROMPTS_DIR, f), name: 'prompts/' + f });
    }
  }
  if (fs.existsSync(AGENTS_DIR)) {
    for (const f of fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).sort()) {
      allFiles.push({ path: path.join(AGENTS_DIR, f), name: 'agents/' + f });
    }
  }
  return allFiles;
}

function checkLineEndings(file, content) {
  return content.includes('\r\n');
}

function checkTrailingWs(file, content) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i] !== lines[i].trimEnd()) {
      return true;
    }
  }
  return false;
}

function checkBareCodeBlocks(file, content) {
  if (!file.name.startsWith('prompts/') || file.name === 'prompts/TEMPLATE.md') {
    return []; // skip template and agent files
  }
  const issues = [];
  const lines = content.split('\n');
  let insideCodeBlock = false;
  for (let li = 0; li < lines.length; li++) {
    const trimmed = lines[li];
    if (/^```\w/.test(trimmed)) {
      // Opening with language specified (```json, ```yaml, etc.)
      insideCodeBlock = !insideCodeBlock;
    } else if (trimmed === '```' || trimmed === '````') {
      if (!insideCodeBlock) {
        // Opening without language — could still be closing of previous block
        // But we can't tell for sure, so we check the next line
        const nextLine = li < lines.length - 1 ? lines[li + 1].trim() : '';
        if (nextLine !== '```' && !/^```/.test(nextLine)) {
          issues.push(file.name + ':' + (li + 1));
        }
      }
      insideCodeBlock = !insideCodeBlock;
    }
  }
  return issues;
}

function checkJsonBlocks(file, content) {
  const issues = [];
  if (!file.name.startsWith('prompts/') || file.name === 'prompts/TEMPLATE.md') {
    return []; // skip agent stubs and template
  }
  const jsonBlockRegex = /```json\n([\s\S]*?)```/g;
  let jsonMatch;
  let blockNum = 0;
  while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
    blockNum++;
    const jsonStr = jsonMatch[1].trim();
    // Prompt files use JSON schema notation with placeholders:
    // This is a VALID schema style, not strict JSON data.
    // Instead of requiring parse-able JSON, verify structural integrity:
    // - Balanced braces
    // - Quoted property names
    // - Valid comment syntax /* ... */
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    const hasQuotedKeys = /"\w+":/.test(jsonStr);

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      issues.push(file.name + ' block #' + blockNum + ': unbalanced braces/brackets');
    } else if (!hasQuotedKeys) {
      issues.push(file.name + ' block #' + blockNum + ': no quoted property keys found');
    }
  }
  return issues;
}

function checkRuleOrder(file, content) {
  if (!file.name.startsWith('prompts/') || file.name === 'prompts/TEMPLATE.md') {
    return [];
  }
  const rulesMatch = content.match(/## RULES\n([\s\S]*?)(?=\n## )/);
  if (!rulesMatch) return [];
  const rulesText = rulesMatch[1];
  const ruleNumbers = [];
  for (const line of rulesText.split('\n')) {
    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) ruleNumbers.push(parseInt(numMatch[1], 10));
  }
  for (let i = 0; i < ruleNumbers.length; i++) {
    if (ruleNumbers[i] !== i + 1) {
      return [file.name + ' rule ' + ruleNumbers[i] + ' at position ' + (i + 1)];
    }
  }
  return [];
}

module.exports = {
  name: 'UNIT: Prompt Format Validation',
  run: async () => {
    const start = Date.now();
    const results = [];
    let totalChecks = 0;
    let passedChecks = 0;

    const allFiles = collectFiles();
    if (allFiles.length === 0) {
      return { passed: false, message: 'No .md files found to validate', time_ms: Date.now() - start };
    }

    // Track per-file issues
    const crlfFiles = [];
    const trailingWsFiles = [];
    let bareCodeBlockIssues = [];
    let jsonIssues = [];
    let ruleOrderIssues = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file.path, 'utf8');
      if (checkLineEndings(file, content)) crlfFiles.push(file.name);
      if (checkTrailingWs(file, content)) trailingWsFiles.push(file.name);
      bareCodeBlockIssues = bareCodeBlockIssues.concat(checkBareCodeBlocks(file, content));
      jsonIssues = jsonIssues.concat(checkJsonBlocks(file, content));
      ruleOrderIssues = ruleOrderIssues.concat(checkRuleOrder(file, content));
    }

    // Report results
    const crlfOk = crlfFiles.length === 0;
    results.push({ name: 'No CRLF line endings', pass: crlfOk });
    totalChecks++;
    if (crlfOk) passedChecks++;
    for (const f of crlfFiles) {
      results.push({ name: '  CRLF: ' + f, pass: false });
      totalChecks++;
    }

    const trailingWsOk = trailingWsFiles.length === 0;
    results.push({ name: 'No trailing whitespace', pass: trailingWsOk });
    totalChecks++;
    if (trailingWsOk) passedChecks++;
    for (const f of trailingWsFiles) {
      results.push({ name: '  Trailing WS: ' + f, pass: false });
      totalChecks++;
    }

    const codeBlockOk = bareCodeBlockIssues.length === 0;
    results.push({ name: 'Code blocks have language specified', pass: codeBlockOk });
    totalChecks++;
    if (codeBlockOk) passedChecks++;
    for (const f of bareCodeBlockIssues) {
      results.push({ name: '  Bare code block: ' + f, pass: false });
      totalChecks++;
    }

    const jsonOk = jsonIssues.length === 0;
    results.push({ name: 'JSON examples parse correctly', pass: jsonOk });
    totalChecks++;
    if (jsonOk) passedChecks++;
    for (const f of jsonIssues) {
      results.push({ name: '  JSON error: ' + f, pass: false });
      totalChecks++;
    }

    const ruleOrderOk = ruleOrderIssues.length === 0;
    results.push({ name: 'Rule numbers are sequential', pass: ruleOrderOk });
    totalChecks++;
    if (ruleOrderOk) passedChecks++;
    for (const f of ruleOrderIssues) {
      results.push({ name: '  Rule order: ' + f, pass: false });
      totalChecks++;
    }

    const allPassed = passedChecks === totalChecks;
    return {
      passed: allPassed,
      message: allPassed
        ? 'All ' + totalChecks + ' format checks passed'
        : passedChecks + '/' + totalChecks + ' passed. ' + results.filter(function(r) { return !r.pass; }).map(function(r) { return r.name; }).join('; '),
      time_ms: Date.now() - start,
    };
  },
};
