// Minecraft Bot adapter entry point
// Usage:
//   import { mcBot } from './adapter/minecraft'
//   const bot = await mcBot({
//     host: 'localhost', port: 25565,
//     brain: { apiKey: '...', baseUrl: '...', model: 'deepseek-chat' }
//   })

import { BrainEngine } from '../../brain-engine/src/core/brain-engine';
import { SurvivalReflex } from '../../brain-engine/src/core/reflex-arc';
import { perceive } from './mc-perceive';
import { act, ActAction } from './mc-act';
import { MineflayerBotLike } from './mc-perceive';

export interface MCBotConfig {
  host: string;
  port?: number;
  username?: string;
  auth?: 'offline' | 'microsoft';
  brain?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}

/**
 * 创建 Mineflayer bot + Brain Engine
 * 自动注册生存反射，启动 50ms tick 循环
 */
export async function mcBot(config: MCBotConfig) {
  // 动态 require mineflayer (不强制依赖)
  let mineflayer: any;
  try {
    mineflayer = await import('mineflayer');
  } catch {
    console.error('❌ mineflayer not installed. Run: npm install mineflayer');
    process.exit(1);
  }

  // 1. 创建 Mineflayer bot
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port ?? 25565,
    username: config.username ?? 'BrainBot',
    auth: config.auth ?? 'offline',
  });

  // 2. 创建 Brain Engine (如果提供了 brain config)
  let brain: BrainEngine | null = null;
  if (config.brain) {
    brain = new BrainEngine({
      apiKey: config.brain.apiKey,
      baseUrl: config.brain.baseUrl,
      model: config.brain.model,
    });
    brain.reflexRegistry.register(new SurvivalReflex());
  }

  // 3. 事件: bot 生成后启动 tick 循环
  bot.once('spawn', () => {
    console.log(`✅ Bot spawned at ${bot.entity.position}`);

    if (brain) {
      brain.start({
        perceive: () => perceive(bot as MineflayerBotLike),
        act: (action: ActAction) => act(bot, action, bot.entities),
      });
      console.log('🧠 Brain Engine tick loop started');
    }
  });

  // 4. 暴露错误事件
  bot.on('kicked', (reason: string) => console.log(`❌ Kicked: ${reason}`));
  bot.on('error', (err: Error) => console.error(`❌ Error: ${err.message}`));
  bot.on('end', () => {
    if (brain) brain.stop();
    console.log('🔌 Bot disconnected');
  });

  return bot;
}
