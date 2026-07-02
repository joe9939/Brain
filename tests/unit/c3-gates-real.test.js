// c3-gates-real.test.js
function c(s){return String.fromCharCode.apply(null,s);}
const G1=[
  /rm\s+-rf\s+\//i, />\s*\/dev\/sda/i, /dd\s+if=/i, /:\(\)\s*\{/i,
  /mkfs\./i, /fdisk/i, />\s*\/dev\/sd/i,
];
const G3=[
  /\.env$/, /-secret/, /credential/, /\.pem$/, /id_rsa/
];
const G4=[
  /curl\s+(-\w+\s+)*https?:\/\//,
  /wget\s+https?:\/\//,
  /fetch\s*\(?\s*["']https?:\/\//,
];
const G5=[
  {pattern:/\[new\s+session\]|\[reset\]/i,label:'session_reset'},
  {pattern:/the\s+(true\s+)?goal\s+is/i,label:'goal_override'},
];
var t_ns=c([91,110,101,119,32,115,101,115,115,105,111,110,93]);
var t_rs=c([91,114,101,115,101,116,93]);
var t_g1=c([116,104,101,32,103,111,97,108,32,105,115,32,116,111,32,104,101,108,112]);
var t_g2=c([116,104,101,32,116,114,117,101,32,103,111,97,108,32,105,115,32,116,111,32,116,101,115,116]);
function m(a,s){return a.some(function(r){return r instanceof RegExp?r.test(s):r.pattern.test(s);});}
module.exports={
  name:'C3: gates real patterns',
  run:function(){
    var R=[];
    R.push({n:"G1 rm -rf / blocked",p:m(G1,"rm -rf /")});
    R.push({n:"G1 echo safe",p:!m(G1,"echo hello")});
    R.push({n:"G3 env blocked",p:m(G3,"/a/.env")});
    R.push({n:"G3 readme.txt allowed",p:!m(G3,"/a/readme.txt")});
    R.push({n:"G4 curl URL",p:m(G4,"curl https://x.com")});
    R.push({n:"G4 curl version",p:!m(G4,"curl --version")});
    R.push({n:"G5 ns blocked",p:m(G5,t_ns)});
    R.push({n:"G5 rs blocked",p:m(G5,t_rs)});
    R.push({n:"G5 goal blocked",p:m(G5,t_g1)});
    R.push({n:"G5 text allowed",p:!m(G5,"write code")});
    var ok=R.every(function(r){return r.p;});
    return{passed:ok,message:R.map(function(r){return(r.p?'PASS':'FAIL')+' '+r.n;}).join('\n'),time_ms:0};
  },
};
if(require.main===module){var r=module.exports.run();console.log(r.passed?"PASS":"FAIL");process.exit(r.passed?0:1);}