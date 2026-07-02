// c3-g1-bypass.test.js — C3 G1 gate patterns vs bypass variants

const G1_PATTERNS = [
  /rm\s+-rf\s+\//i, />\s*\/dev\/sda/i, /dd\s+if=/i, /:\(\)\s*\{/i,
  /mkfs\./i, /fdisk/i, />\s*\/dev\/sd/i,
];

function matchAny(s) {
  return G1_PATTERNS.some(p => p.test(s));
}

module.exports = {
  name: 'C3: G1 bypass variants',
  run: () => {
    const R = [];

    // Multiple spaces: \s+ matches 1+ spaces, so G1 catches these
    R.push({n:'multiple-spaces: rm -rf  /', p: matchAny('rm -rf  /') === true});
    R.push({n:'multiple-spaces: rm  -rf   /', p: matchAny('rm  -rf   /') === true});

    // Unicode homoglyphs: en-dash / hyphen-minus differ from ASCII -
    // G1 pattern uses literal -, so homoglyphs bypass
    R.push({n:'unicode-homoglyph: rm \u2013rf /', p: matchAny('rm \u2013rf /') === false});
    R.push({n:'unicode-homoglyph: rm \u2212rf /', p: matchAny('rm \u2212rf /') === false});

    // Base64 encoded: string may contain the dangerous text after decode
    // G1 matches on the raw command string, so if base64 input is truly encoded it bypasses
    R.push({n:'base64-encoded: harmless base64', p: matchAny('ZWNobyBIYWNrZWQ= | base64 -d | sh') === false});

    // Environment variable injection: no literal / so G1 doesn't match
    R.push({n:'env-var-injection: rm -rf $TARGET', p: matchAny('rm -rf $TARGET') === false});
    R.push({n:'env-var-injection: rm -rf ${ROOT}', p: matchAny('rm -rf ${ROOT}') === false});

    // Null byte injection: \0 doesn't break regex, rm -rf / is still matched
    R.push({n:'null-byte: rm -rf /\0home', p: matchAny('rm -rf /\0home') === true});

    // Tabs: \s matches tabs, so G1 catches these
    R.push({n:'tabs: rm\t-rf\t/', p: matchAny('rm\t-rf\t/') === true});
    R.push({n:'tabs: rm\t-rf\t\t/', p: matchAny('rm\t-rf\t\t/') === true});

    // Mixed case: G1 has /i flag, so case variants are caught
    R.push({n:'mixed-case: RM -RF /', p: matchAny('RM -RF /') === true});
    R.push({n:'mixed-case: Rm -rF /', p: matchAny('Rm -rF /') === true});

    // Command substitution: shell expands $(...) before execution,
    // but G1 sees the raw string — still contains rm -rf /
    R.push({n:'cmd-substitution: $(rm -rf /)', p: matchAny('$(rm -rf /)') === true});
    R.push({n:'cmd-substitution: `rm -rf /`', p: matchAny('`rm -rf /`') === true});

    const ok = R.every(r => r.p);
    return {
      passed: ok,
      message: R.map(r => (r.p ? 'PASS' : 'FAIL') + ' ' + r.n).join('\n'),
      time_ms: 0,
    };
  },
};
if (require.main === module) { const r=module.exports.run(); console.log(r.passed?'PASS':'FAIL'); process.exit(r.passed?0:1); }
