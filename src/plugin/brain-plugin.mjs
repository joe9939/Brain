import { appendFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
const L = join(homedir(),".config","opencode","brain.log");
function log(o){try{appendFileSync(L,JSON.stringify({ts:new Date().toISOString(),...o})+'\n');}catch(e){}}
export const BrainPlugin = async (ctx) => {
  log({event:"plugin_loaded"});
  const S = new Map();
  const BASH=[/rm\s+-rf\s+\//,/curl.*\|.*(ba)?sh/];
  const SEN=[/\.env$/,/-secret/,/credential/,/\.pem$/,/id_rsa/,/\.htpasswd/];
  const INJ=[/ignore\s+(all\s+)?(previous|above)\s+(instructions|messages)/i,/you\s+are\s+now/i,/system\s+prompt\s*:/i];
  return {
    event: async (input) => {
      const t = input?.event?.type;
      const a = input?.event?.session?.agent;
      const id = (input?.event?.session?.id||"").slice(-8);
      log({hook:"event",type:t,agent:a,sid:id});
      if (t === "session.created" && a === "brain") {
        S.set(input.event.session.id, {mode:"NORMAL",actions:0,start:Date.now()});
        log({event:"brain_activated",sid:id});
      }
      if (t === "session.deleted") S.delete(input?.event?.session?.id);
    },
    "tool.execute.before": async (input,output) => {
      const s=S.get(input.sessionID);if(!s)return;
      const t=(input.tool||'').toLowerCase(),a=output.args||{},c=a.command||'',p=a.file_path||a.target||'';
      if(t==='bash'&&c){for(const r of BASH){if(r.test(c)){log({block:"L1",cmd:c.slice(0,80)});throw new Error("L1 BLOCK");}}}
      if(['write','edit','delete'].includes(t)&&p&&SEN.some(r=>r.test(p))){log({block:"G3",path:p});throw new Error("G3: "+p);}
      if(['write','edit'].includes(t)&&a.content&&INJ.some(r=>r.test(String(a.content)))){log({block:"G3_inject"});throw new Error("G3: injection");}
      s.actions++;
      log({hook:"before",tool:t,sid:(input.sessionID||"").slice(-8)});
    },
    "tool.execute.after": async (input,output) => {
      const s=S.get(input.sessionID);if(!s)return;
      const t=(input.tool||'').toLowerCase();
      if(t==='task')log({hook:"after_task",agent:input.args?.subagent_type||"unknown",sid:(input.sessionID||"").slice(-8)});
    },
    "chat.message": async (input,output) => {
      const s=S.get(input.sessionID);if(!s)return;
      const msg=String(output.message||'');let pre='';
      const sid=(input.sessionID||"").slice(-8);
      log({hook:"chatmsg",sid:sid,msg:msg.slice(0,80)});
      if(/(urgent|asap|emergency)/i.test(msg)){s.mode='URGENT';log({mode:"URGENT",sid:sid});}
      else if(/(try|explore|experiment)/i.test(msg)){s.mode='EXPLORE';}
      else if(/(broken|again|malfunction)/i.test(msg)){s.mode='SUPPORT';}
      if(s.mode!=='NORMAL')pre+='[MODE:'+s.mode+']\n';
      if(pre)output.message=pre+output.message;
    },
    "experimental.chat.system.transform": async (input,output) => {
      const sid=input.sessionID;if(!sid||!S.has(sid))return;
      log({hook:"system",sid:sid.slice(-8)});
      output.system=(output.system||'')+'\n[BEFORE edit: score_action(). AFTER: world_update(). Complex: task(swarm-planner). Use task()-never code yourself.]\n';
    },
  };
};