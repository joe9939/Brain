// Minecraft Brain Bot — 完整调试模式
import { createInterface } from 'readline';
import { readFileSync, appendFileSync } from 'fs';
import { BrainEngine } from './brain-engine/src/core/brain-engine';
import { SurvivalReflex } from './brain-engine/src/core/reflex-arc';
import { MinecraftPerceiver } from './adapter/minecraft/mc-perceive';
import { act } from './adapter/minecraft/mc-act';

const LOG = 'brainy-debug.log';
function log(msg: string) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  appendFileSync(LOG, line + '\n');
  console.log(line);
}

async function main() {
  // 加载 .env
  try {
    const env = readFileSync('.env', 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^(\w+)=(.+)/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch {}

  log('🧠 Starting Brainy (full debug)...');

  // 动态 import mineflayer
  let mineflayer: any;
  try { mineflayer = await import('mineflayer'); }
  catch { log('❌ mineflayer not installed'); process.exit(1); }

  // 创建 bot
  const bot = mineflayer.createBot({
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT || '25565', 10),
    username: process.env.MC_USERNAME || 'Brainy',
    auth: 'offline',
  });

  // 创建 Brain Engine
  const brain = new BrainEngine({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
  });
  brain.reflexRegistry.register(new SurvivalReflex());
  const perceiver = new MinecraftPerceiver();

  let tickCount = 0;
  bot.once('spawn', () => {
    log(`✅ Spawned at (${bot.entity.position.x}, ${bot.entity.position.y}, ${bot.entity.position.z})`);

    setInterval(async () => {
      tickCount++;
      const snapshot = perceiver.perceive(bot);
      const result = await brain.tick(snapshot);
      act(bot, result.action || { action: 'none' }, bot.entities);

      if (tickCount % 20 === 0) {
        const h = brain.hormone.state;
        log(`📍(${snapshot.position.x.toFixed(1)},${snapshot.position.y.toFixed(0)},${snapshot.position.z.toFixed(1)}) HP:${snapshot.health} Food:${snapshot.hunger} Adr:${(h.adrenaline*100).toFixed(0)} Cort:${(h.cortisol*100).toFixed(0)} Endo:${(h.endorphin*100).toFixed(0)}`);
      }
      if (result.type !== 'predictive_pass') {
        log(`🧠 #${tickCount}: ${result.type} ${result.handler||''} ${result.latency}ms`);
      }
    }, 50);
  });

  bot.on('health', () => log(`❤️ HP:${bot.health} Food:${bot.food}`));
  bot.on('death', () => log('💀 Died!'));
  bot.on('kicked', (r: string) => log(`❌ Kicked: ${r}`));
  bot.on('error', (e: Error) => log(`❌ Error: ${e.message}`));
  bot.on('end', () => log('🔌 Disconnected'));

  log('✅ Brainy online. Type status/chat/quit');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    if (line === 'quit' || line === 'exit') { bot.end(); process.exit(0); }
    if (line.startsWith('chat ')) { bot.chat(line.slice(5)); log(`💬 ${line.slice(5)}`); }
    if (line === 'status') {
      log(`📍 (${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(0)},${bot.entity.position.z.toFixed(1)}) HP:${bot.health} Food:${bot.food}`);
    }
  });
}

main().catch(e => { log(`❌ Fatal: ${e.message}`); process.exit(1); });
