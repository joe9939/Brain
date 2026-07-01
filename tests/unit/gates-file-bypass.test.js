// gates-file-bypass.test.js — G3 sensitive file path pattern edge cases

function c(s) { return String.fromCharCode.apply(null, s); }
function y(s) { return new RegExp(s, 'i'); }

const SE = y(c([92, 46, 101, 110, 118, 36]));

module.exports = {
  name: 'G3 File Bypass',
  run: async () => {
    const start = Date.now();
    const results = [];

    // Direct .env matches
    results.push({ name: 'G3: .env blocked', pass: SE.test('.env') });
    results.push({ name: 'G3: path/.env blocked', pass: SE.test('/path/to/.env') });

    // Parent dir path traversal — .env in parent dir
    results.push({ name: 'G3: ../.env blocked', pass: SE.test('../.env') });

    // Case variants — .env should match due to /i flag, .ENV too
    results.push({ name: 'G3: .ENV blocked (case)', pass: SE.test('.ENV') });
    results.push({ name: 'G3: .Env blocked (case)', pass: SE.test('.Env') });

    // Backslash path (Windows)
    results.push({ name: 'G3: .env backslash path', pass: SE.test('folder\\.env') });

    // .env.bak should NOT block (pattern ends with $)
    results.push({ name: 'G3: .env.bak bypasses (no $ match)', pass: !SE.test('.env.bak') });

    // .env file in subdir should block
    results.push({ name: 'G3: subdir/.env blocked', pass: SE.test('config/.env') });

    // Non-.env files pass
    results.push({ name: 'G3: .txt passes', pass: !SE.test('notes.txt') });
    results.push({ name: 'G3: env.js passes', pass: !SE.test('env.js') });

    return { passed: results.every(r => r.pass), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
