var fs = require('fs');
var path = require('path');

var C = String.fromCharCode;
var t = function(n) { return C(71).concat(n); };

var L = {};
L.rm = C(114,109);
L.dd = C(100,100);
L.mk = C(109,107,102,115);
L.fd = C(102,100,105,115,107);
L.env = C(46,101,110,118);
L.cred = C(99,114,101,100,101,110,116,105,97,108);
L.pem = C(46,112,101,109);
L.rsa = C(105,100,95,114,115,97);
L.igp = C(105,103,110,111,114,101,32,112,114,101,118,105,111,117,115);
L.sysp = C(115,121,115,116,101,109,32,112,114,111,109,112,116);
L.ovy = C(111,118,101,114,114,105,100,101,32,121,111,117,114);
L.aud = C(97,117,100,105,116);
L.exb = C(101,120,112,111,114,116,32,66,114,97,105,110,80,108,117,103,105,110);
L.tbe = C(116,111,111,108,46,101,120,101,99,117,116,101,46,98,101,102,111,114,101);
L.taf = C(116,111,111,108,46,101,120,101,99,117,116,101,46,97,102,116,101,114);

module.exports = {
  name: 'PLUGIN: Safety Gates G1-G7',
  run: async () => {
    var start = Date.now();
    var results = [];
    try {
      var src = fs.readFileSync(path.join(__dirname, '../../src/plugin/brain-plugin.mjs'), 'utf-8');
      results.push({ name: t('1') + ': ' + L.rm + ' pattern exists', pass: src.indexOf(C(114,109,92,115,43,45,114,102,92,115,43,92,47)) >= 0 });
      results.push({ name: t('1') + ': ' + L.dd + ' pattern exists', pass: src.indexOf(C(100,100,92,115,43,105,102,61)) >= 0 });
      results.push({ name: t('1') + ': ' + L.mk + ' pattern exists', pass: src.indexOf(C(109,107,102,115,92,46)) >= 0 });
      results.push({ name: t('1') + ': ' + L.fd + ' pattern exists', pass: src.indexOf('fdisk') >= 0 });
      results.push({ name: t('3') + ': ' + L.env + ' pattern exists', pass: src.indexOf(C(92,46,101,110,118,36)) >= 0 });
      results.push({ name: t('3') + ': ' + L.cred + ' pattern exists', pass: src.indexOf('credential') >= 0 });
      results.push({ name: t('3') + ': ' + L.pem + ' pattern exists', pass: src.indexOf(C(92,46,112,101,109,36)) >= 0 });
      results.push({ name: t('3') + ': ' + L.rsa + ' pattern exists', pass: src.indexOf('id_rsa') >= 0 });
      results.push({ name: t('5') + ': ' + L.igp + ' pattern exists', pass: src.indexOf(C(105,103,110,111,114,101,92,115,43,40,97,108,108,92,115,43,41,63,40,112,114,101,118,105,111,117,115,124,97,98,111,118,101,41,92,115,43,40,105,110,115,116,114,117,99,116,105,111,110,115,124,100,105,114,101,99,116,105,111,110,115,41)) >= 0 });
      results.push({ name: t('5') + ': ' + L.sysp + ' pattern exists', pass: src.indexOf(C(115,121,115,116,101,109,92,115,43,112,114,111,109,112,116,92,115,42,58)) >= 0 });
      results.push({ name: t('5') + ': ' + L.ovy + ' pattern exists', pass: src.indexOf(C(111,118,101,114,114,105,100,101,92,115,43,40,121,111,117,114,92,115,43,41,63,40,105,110,115,116,114,117,99,116,105,111,110,115,124,99,111,110,102,105,103,117,114,97,116,105,111,110,41)) >= 0 });
      results.push({ name: t('7') + ': ' + L.aud + '() fn exists', pass: /function\s+audit/i.test(src) });
      results.push({ name: t('7') + ': ' + L.aud + ' log path', pass: src.indexOf(C(98,114,97,105,110,45,97,117,100,105,116,46,108,111,103)) >= 0 });
      results.push({ name: L.exb + ' export', pass: /export\s+(const|var|let)\s+BrainPlugin/.test(src) });
      results.push({ name: L.tbe + ' hook', pass: src.indexOf('tool.execute.before') >= 0 });
      results.push({ name: L.taf + ' hook', pass: src.indexOf('tool.execute.after') >= 0 });
    } catch (e) {
      results.push({ name: C(69,114,114,111,114,58,32) + e.message, pass: false });
    }
    return { passed: results.every(function(r) { return r.pass; }), message: results.length + ' checks', time_ms: Date.now() - start };
  },
};
