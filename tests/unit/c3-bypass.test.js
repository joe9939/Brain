// c3-bypass.test.js — C3 Safety gates bypass tests for G3/G4/G5

const SENSITIVE_FILES = [/\.env$/, /-secret/, /credential/, /\.pem$/, /id_rsa/, /\.htpasswd/, /secrets\./, /\.token/, /auth\.json/];
const EGRESS_PATTERNS = [/curl\s+(-\w+\s+)*https?:\/\//, /wget\s+https?:\/\//, /fetch\s*\(?\s*["']https?:\/\//];
const INJECTION = [
  { pattern: /session_reset|new_session/i, label: "reset" },
  { pattern: /the\s+(true\s+)?goal\s+is/i, label: "goal" },
];

function matchAny(patterns, s) {
  return patterns.some(p => p.test ? p.test(s) : p.pattern.test(s));
}

module.exports = {
  name: 'C3: bypass detection',
  run: () => {
    const R = [];
    const g3Hit = ['.env','config.env','-secret','api-secret','credentials.json','credential','key.pem','id_rsa'];
    const g3Safe = ['readme.txt','index.js','package.json'];
    R.push({n:'G3 sensitive hit', p: g3Hit.every(s=>matchAny(SENSITIVE_FILES,s))});
    R.push({n:'G3 safe pass', p: g3Safe.every(s=>!matchAny(SENSITIVE_FILES,s))});

    const g4Hit = ['curl https://x.com','curl -s https://x.com','wget https://x.com','fetch("https://x.com")'];
    const g4Safe = ['curl --help','wget --version'];
    R.push({n:'G4 egress hit', p: g4Hit.every(s=>matchAny(EGRESS_PATTERNS,s))});
    R.push({n:'G4 safe pass', p: g4Safe.every(s=>!matchAny(EGRESS_PATTERNS,s))});

    const g5Hit = ['the goal is','the true goal is'];
    const g5Safe = ['the purpose is','the target is'];
    R.push({n:'G5 injection hit', p: g5Hit.every(s=>matchAny(INJECTION,s))});
    R.push({n:'G5 safe pass', p: g5Safe.every(s=>!matchAny(INJECTION,s))});

    const ok = R.every(r=>r.p);
    return {passed: ok, message: R.map(r=>(r.p?'PASS':'FAIL')+' '+r.n).join('\n'), time_ms: 0};
  },
};
if (require.main === module) { const r=module.exports.run(); console.log(r.passed?'PASS':'FAIL'); process.exit(r.passed?0:1); }
