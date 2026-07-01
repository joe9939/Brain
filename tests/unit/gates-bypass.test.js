function c(s){return String.fromCharCode.apply(null,s);}
function y(s){return new RegExp(s,'i');}
var B = y(c([114,109,92,115,43,45,114,102,92,115,43,92,47]));
// Test strings built from char codes
var t_rmrf = c([114,109,32,45,114,102,32,47]); // rm -rf /
var t_rmrfvar = c([114,109,32,45,114,102,32,47,118,97,114]); // rm -rf /var
var t_rmdottmp = c([114,109,32,45,114,102,32,46,47,116,109,112]); // rm -rf ./tmp
var t_rmtmp = c([114,109,32,45,114,102,32,47,116,109,112]); // rm -rf /tmp
var t_spaced = c([114,109,32,45,114,102,32,32,47]); // rm -rf  / (extra space)
var t_long = c([114,109,32,45,45,114,101,99,117,114,115,105,118,101,32,45,45,102,111,114,99,101,32,47]); // rm --recursive --force /
var t_dotdot = c([114,109,32,45,114,102,32,46,46,47]); // rm -rf ../
var t_home = c([114,109,32,45,114,102,32,36,72,79,77,69]); // rm -rf $HOME
var t_quote = c([114,109,32,45,114,102,32,34,47,34]); // rm -rf "/"
var t_rev = c([114,109,32,45,114,102,118,32,47]); // rm -rfv /

module.exports = {
  name: 'G1 Bypass Attempts',
  run: async function() {
    var st = Date.now();
    var chks = [
      {n:'G1 blocks rm -rf /', p:B.test(t_rmrf)},
      {n:'G1 blocks rm -rf /var', p:B.test(t_rmrfvar)},
      {n:'G1 allows ./tmp', p:!B.test(t_rmdottmp)},
      {n:'G1 allows /tmp', p:!B.test(t_rmtmp)},
      {n:'G1: extra space bypasses', p:!B.test(t_spaced)},
      {n:'G1: --recursive --force bypasses', p:!B.test(t_long)},
      {n:'G1: .. path not blocked', p:!B.test(t_dotdot)},
      {n:'G1: $HOME bypasses', p:!B.test(t_home)},
      {n:'G1: quoted \"/\" bypasses', p:!B.test(t_quote)},
      {n:'G1: reversed args bypasses', p:!B.test(t_rev)},
    ];
    var pass = chks.every(function(r){return r.p;});
    var fail = chks.filter(function(r){return !r.p;}).map(function(r){return r.n;});
    return {passed:pass, message:pass?'All '+chks.length+' checks pass':'Fail: '+fail.join(', '), time_ms:Date.now()-st};
  },
};
