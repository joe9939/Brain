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
  // Clear non-permanent control states on entry (except for continuous moves)
  const clearFirst = !['move_forward','move_back','move_left','move_right','wander'].includes(action.action);
  if (clearFirst) bot.clearControlStates();

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
    case 'idle':
    case 'none':
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
    case 'seek_food':  // same: eat if have, look if don't
      // Try to consume if holding food, otherwise look around
      try { bot.consume(); } catch { bot.setControlState('forward', true); }
      break;
    case 'flee':
      bot.setControlState('sprint', true);
      bot.setControlState('forward', true);
      bot.setControlState('jump', true);
      break;
    case 'move_to_water':
      bot.setControlState('forward', true);
      break;
    case 'move_to_surface':
      bot.setControlState('jump', true);
      break;

    // ── 建筑 ──
    case 'place_block':
    case 'build_shelter':  // place a block above head
      if (action.params?.blockType) {
        try { bot.equip(action.params.blockType, 'hand'); } catch {}
      }
      // Place at feet level
      const refBlock = bot.blockAt(bot.entity.position);
      if (refBlock) bot.placeBlock(refBlock, { x: 0, y: 1, z: 0 });
      break;

    // ── 挖掘 + 采集 ──
    case 'dig':
      if (action.params?.block) bot.dig(action.params.block);
      break;

    // ── 制作 ──
    case 'craft_tool':
      // Simple: try to find available crafting recipes
      // In full implementation, this would open crafting table
      // For now, just look down and try to dig
      bot.setControlState('forward', true);
      break;

    // ── 探索 ──
    case 'wander':
      // Random movement: forward + occasional direction change
      bot.setControlState('forward', true);
      // Random turn every few seconds
      if (Math.random() < 0.05) {
        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, 0, true);
      }
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
