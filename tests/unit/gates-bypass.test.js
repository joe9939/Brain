// gates-bypass.test.js — Tests actual G1 gate patterns
// Uses the actual BASH_DANGER patterns from brain-plugin.mjs
// G1 blocks: rm -rf /, dd if=, mkfs, fdisk, >/dev/sd

// Replicate the actual G1 gate patterns from src/plugin/brain-plugin.mjs
var BASH_DANGER = [
  /rm\s+-rf\s+\//i, />\s*\/dev\/sda/i, /dd\s+if=/i, /:\(\)\s*\{/i,
  /mkfs\./i, /fdisk/i, />\s*\/dev\/sd/i,
];

module.exports = {
  name: 'G1 Gate Patterns (current)',
  run: function() {
    var st = Date.now();
    function matchAny(cmd) {
      for (var i = 0; i < BASH_DANGER.length; i++) {
        if (BASH_DANGER[i].test(cmd)) return true;
      }
      return false;
    }
    var chks = [
      {n:'G1 blocks rm -rf /', p: matchAny('rm -rf /')},
      {n:'G1 blocks rm -rf /var', p: matchAny('rm -rf /var')},
      {n:'G1 blocks dd if=/dev/zero', p: matchAny('dd if=/dev/zero of=/dev/sda')},
      {n:'G1 blocks mkfs', p: matchAny('mkfs.ext4 /dev/sda1')},
      {n:'G1 blocks fdisk', p: matchAny('fdisk /dev/sda')},
      {n:'G1 blocks >/dev/sda', p: matchAny('echo test >/dev/sda')},
      {n:'G1 allows ./tmp', p: !matchAny('rm -rf ./tmp')},
      {n:'G1 allows $HOME', p: !matchAny('rm -rf $HOME')},
      {n:'G1 allows echo safe', p: !matchAny('echo hello')},
      {n:'G1 allows ls -la', p: !matchAny('ls -la')},
    ];
    var pass = chks.every(function(r){return r.p;});
    var fail = chks.filter(function(r){return !r.p;}).map(function(r){return r.n;});
    return {passed:pass, message:pass?'All '+chks.length+' checks pass':'Fail: '+fail.join(', '), time_ms:Date.now()-st};
  },
};
