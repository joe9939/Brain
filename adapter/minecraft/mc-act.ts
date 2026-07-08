// Minecraft Act — TickResult → Mineflayer 动作执行
// 通用: 无论 brain v2 还是 GPT, 执行动作的方式一样

export interface ActAction {
  action: string;
  params?: Record<string, any>;
}

export interface EntityMap {
  [entityId: string]: any;
}

export function act(bot: any, action: ActAction, entities?: EntityMap): void {
  switch (action.action) {
    // ── 移动 ──
    case 'move_forward':
      bot.setControlState('forward', true);
      break;
    case 'move_back':
      bot.setControlState('back', true);
      break;
    case 'move_left':
      bot.setControlState('left', true);
      break;
    case 'move_right':
      bot.setControlState('right', true);
      break;
    case 'jump':
      bot.setControlState('jump', true);
      break;
    case 'sneak':
      bot.setControlState('sneak', true);
      break;
    case 'sprint':
      bot.setControlState('sprint', true);
      break;
    case 'stop':
      bot.clearControlStates();
      break;

    // ── 战斗 ──
    case 'attack': {
      const target = entities?.[action.params?.entityId];
      if (target) bot.attack(target);
      break;
    }

    // ── 生存 ──
    case 'eat_food':
      bot.consume();
      break;
    case 'move_to_water':
      bot.setControlState('forward', true);
      break;
    case 'move_to_surface':
      bot.setControlState('jump', true);
      break;

    // ── 建筑 ──
    case 'place_block':
      if (action.params?.blockType) {
        try { bot.equip(action.params.blockType, 'hand'); } catch {}
      }
      if (action.params?.referenceBlock && action.params?.face) {
        bot.placeBlock(action.params.referenceBlock, action.params.face);
      }
      break;

    // ── 挖掘 ──
    case 'dig':
      if (action.params?.block) bot.dig(action.params.block);
      break;

    // ── 交互 ──
    case 'look_at':
      if (action.params?.x != null) {
        bot.lookAt({ x: action.params.x, y: action.params.y, z: action.params.z });
      }
      break;
    case 'chat':
      if (action.params?.message) bot.chat(action.params.message);
      break;
    case 'activate_block':
      if (action.params?.block) bot.activateBlock(action.params.block);
      break;
    case 'sleep':
      if (action.params?.bed) bot.sleep(action.params.bed);
      break;
    case 'wake':
      bot.wake();
      break;

    // ── 物品 ──
    case 'equip':
      if (action.params?.item) bot.equip(action.params.item, action.params?.destination || 'hand');
      break;
    case 'toss':
      if (action.params?.item) bot.toss(action.params.item, action.params?.metadata ?? null, action.params?.count ?? 1);
      break;

    // ── 钓鱼 ──
    case 'fish':
      bot.fish();
      break;

    default:
      // unknown action — no-op
      break;
  }
}
