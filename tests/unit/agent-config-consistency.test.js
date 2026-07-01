var fs = require('fs');
var path = require('path');
var config = require('../config');

module.exports = {
  name: 'Agent Config Consistency',
  run: async function() {
    var start = Date.now();
    var results = [];
    var ohmPath = path.join(config.BRAIN_AGENT_DIR, 'oh-my-openagent.jsonc');
    var agentDir = path.join(config.BRAIN_AGENT_DIR, '.opencode', 'agents');
    var exampleCfg = path.join(config.BRAIN_AGENT_DIR, 'config', 'opencode.example.json');

    function stripJsonc(text) {
      var r='',inStr=false,i=0;
      while(i<text.length){var c=text[i],n=text[i+1]||'';
        if(inStr){r+=c;if(c==='\\'){r+=n;i+=2;continue}if(c==='"')inStr=false;i++;continue}
        if(c==='"'){inStr=true;r+=c;i++;continue}
        if(c==='/'&&n==='/'){while(i<text.length&&text[i]!=='\n')i++;if(i<text.length)r+='\n';i++;continue}
        if(c==='/'&&n==='*'){i+=2;while(i<text.length&&!(text[i]==='*'&&text[i+1]==='/'))i++;i+=2;continue}
        r+=c;i++}
      return r.replace(/,(\s*[}\]])/g,'$1');
    }

    if (!fs.existsSync(ohmPath)) {
      return {passed:false,message:'oh-my-openagent.jsonc not found',time_ms:Date.now()-start};
    }

    try {
      var ohm = JSON.parse(stripJsonc(fs.readFileSync(ohmPath,'utf8')));
      var cats = ohm.categories || {};
      var allCats = Object.keys(cats);
      var brainCats = allCats.filter(function(k){return k.startsWith('brain-');});

      // 1. Every brain category has model
      var noModel = brainCats.filter(function(k){return !cats[k].model;});
      results.push({name:'All brain cats have model ('+brainCats.length+' cats)', pass:noModel.length===0});

      // 2. Every brain category has variant
      var noVariant = brainCats.filter(function(k){return !cats[k].variant;});
      results.push({name:'All brain cats have variant', pass:noVariant.length===0});

      // 3. Agent files exist
      var agentFiles = fs.existsSync(agentDir) ? fs.readdirSync(agentDir).filter(function(f){return f.endsWith('.md');}) : [];
      results.push({name:'Agent files >= 20 ('+agentFiles.length+')', pass:agentFiles.length>=20});

      // 4. Most categories map to files (some have naming mismatches — that's OK)
      var catToAgentFile = {};
      var mappings = {
        'thalamus':'thalamus','amygdala':'amygdala','hippocampus':'hippocampus',
        'world-cortex':'world-cortex','attention':'attention-cortex','reward':'reward-cortex',
        'safety':'safety-cortex','basal':'basal-ganglia','cerebellum':'cerebellum',
        'self-enhance':'self-enhance-cortex','swarm-planner':'swarm-planner',
        'swarm-coder':'swarm-coder','swarm-reviewer':'swarm-reviewer','swarm-tester':'swarm-tester',
        'insula':'insula','hypothalamus':'hypothalamus','dmn':'dmn',
        'self-optimizer':'self-optimizer','consolidation':'offline-consolidation',
        'premotor-cortex':'brain-premotor-cortex','dlpfc':'brain-dlpfc',
        'basal-ganglia':'basal-ganglia','master':'brain', 'coordinator':'brain',
      };
      var unmatched = 0;
      for (var i=0;i<brainCats.length;i++) {
        var cname = brainCats[i];
        var base = cname.replace('brain-','');
        var expectedFile = (mappings[base]||base)+'.md';
        if (agentFiles.indexOf(expectedFile)===-1) unmatched++;
      }
      // Allow some mismatch (gate-tuner, curiosity, coordinator etc. not in agent dir)
      results.push({name:'Brain cats map to agent files (unmatched: '+unmatched+')', pass:unmatched<=4});

      // 5. Example config has agent entries
      if (fs.existsSync(exampleCfg)) {
        var example = JSON.parse(fs.readFileSync(exampleCfg,'utf8'));
        var exampleAgents = Object.keys(example.agent||{});
        results.push({name:'Example config has agents ('+exampleAgents.length+')', pass:exampleAgents.length>=20});
      } else {
        results.push({name:'Example config exists', pass:false});
      }

      var pass = results.every(function(r){return r.pass;});
      var fail = results.filter(function(r){return !r.pass;}).map(function(r){return r.name;});
      return {passed:pass, message:pass?'All '+results.length+' checks pass':'Fail: '+fail.join(', '), time_ms:Date.now()-start};
    } catch(e) {
      return {passed:false, message:'Error: '+e.message, time_ms:Date.now()-start};
    }
  },
};
