// install.test.js — Tests for brain-agent's install script
// We test stripJsoncComments (pure function) and version print
import { describe, test, expect } from 'bun:test';
import { execSync } from 'child_process';

// stripJsoncComments — inlined for testing since the function is not exported
function stripJsoncComments(text) {
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1] || '';
    if (inString) {
      result += c;
      if (c === '\\\\' && (next === '\"' || next === '\\\\' || next === '/' || next === 'n' || next === 't')) {
        result += next; i += 2; continue;
      }
      if (c === stringChar) inString = false;
      i++; continue;
    }
    if (c === '\"') { inString = true; stringChar = c; result += c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      if (i < text.length) result += '\n';
      i++; continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i+1] === '/')) i++;
      i += 2; continue;
    }
    result += c; i++;
  }
  return result;
}

describe('stripJsoncComments', () => {
  test('passes through plain JSON', () => {
    const input = '{\"key\": \"value\"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  test('removes single-line comments', () => {
    const input = '{\n  // This is a comment\n  \"key\": \"value\"\n}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('// This is a comment');
    expect(result).toContain('\"key\": \"value\"');
  });

  test('removes block comments', () => {
    const input = '{\n  /* block comment */\n  \"key\": \"value\"\n}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('/* block comment */');
    expect(result).toContain('\"key\": \"value\"');
  });

  test('preserves URLs with slashes in strings', () => {
    const input = '{\"url\": \"https://example.com/api\"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  test('handles escaped quotes in strings', () => {
    const input = '{\"msg\": \"he said \\\"hello\\\"\"}';
    expect(stripJsoncComments(input)).toBe(input);
  });

  test('removes trailing comment after content', () => {
    const input = '\"value\" // comment';
    const result = stripJsoncComments(input);
    expect(result).toContain('\"value\"');
    expect(result).not.toContain('// comment');
  });

  test('preserves newlines in multiline content', () => {
    const input = 'line1\n// comment\nline2';
    const result = stripJsoncComments(input);
    expect(result).toContain('line1');
    expect(result).toContain('\n');
    expect(result).toContain('line2');
    expect(result).not.toContain('// comment');
  });

  test('handles empty input', () => {
    expect(stripJsoncComments('')).toBe('');
  });

  test('processes real JSONC object', () => {
    const input = '{\n  // Configuration\n  /* Main block */\n  "name": "test",\n  "version": "1.0.0"\n}';
    const result = stripJsoncComments(input);
    expect(result).not.toContain('// Configuration');
    expect(result).not.toContain('/* Main block */');
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('test');
    expect(parsed.version).toBe('1.0.0');
  });
});

describe('Version flag', () => {
  test('--version prints brain-agent version', () => {
    const result = execSync('node install.js --version', { encoding: 'utf8' });
    expect(result.trim()).toMatch(/brain-agent v\d+\.\d+\.\d+/);
  });
});
