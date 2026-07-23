// Minecraft Act — Direct Mineflayer API bridge
// Every action maps to a real Mineflayer method or PrismarineJS plugin

export interface ActAction {
  action: string;
  params?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface EntityMap {
  [entityId: string]: any;
}

/**
 * Abstract → Concrete action mapping.
 * Brain layer uses abstract actions (gather, craft, eat, explore, build, rest, move).
 * This adaptor translates them to mineflayer-specific implementations.
 */
function resolveAbstractAction(action: ActAction): ActAction {
  const a = action.action;
  const p = action.params || {};

  // gather(resource) → concrete resource-finding action
  if (a === 'gather') {
    switch (p.resource) {
      case 'wood': return { action: 'find_wood', params: p };
      case 'food': return { action: 'seek_food', params: p };
      case 'stone': return { action: 'dig_nearby', params: { ...p, priority: 'stone' } };
      case 'iron_ore': return { action: 'dig_nearby', params: { ...p, goal: 'find_iron_ore', y: 11 } };
      case 'wool': return { action: 'goto_goal', params: { goal: 'find_sheep' } };
      default: return { action: 'dig_nearby', params: p };
    }
  }

  // craft(item) → craft with recipe name
  if (a === 'craft') {
    if (p.burn) {
      // Smelting: craft iron_ingot by burning iron_ore
      return { action: 'smelt', params: p };
    }
    return { action: 'craft', params: { ...p, recipe: p.item } };
  }

  // eat → eat_food
  if (a === 'eat') return { action: 'eat_food', params: p };

  // explore → wander
  if (a === 'explore') return { action: 'wander', params: p };

  // build → build_shelter
  if (a === 'build') return { action: 'build_shelter', params: p };

  // rest → sleep
  if (a === 'rest') return { action: 'sleep', params: p };

  // move → move_to_surface or goto_goal
  if (a === 'move') {
    if (p.to === 'surface') return { action: 'move_to_surface', params: p };
    return { action: 'goto_goal', params: p };
  }

  // place → place_block
  if (a === 'place') return { action: 'place_block', params: { blockType: p.block } };

  return action;
}

export async function act(bot: any, action: ActAction, entities?: EntityMap): Promise<ActionResult> {
  // Resolve abstract action to concrete before execution
  action = resolveAbstractAction(action);

  const continuous = ['forward', 'back', 'left', 'right'];
  if (!continuous.includes(action.action)) {
    bot.clearControlStates();
  }

  try {
    switch (action.action) {
      // ═══════════════════════════════════════════
      // Movement (bot.setControlState)
      // ═══════════════════════════════════════════
      case 'forward': bot.setControlState('forward', true); return { success: true };
      case 'back':    bot.setControlState('back', true);    return { success: true };
      case 'left':    bot.setControlState('left', true);    return { success: true };
      case 'right':   bot.setControlState('right', true);   return { success: true };
      case 'jump':    bot.setControlState('jump', true);    return { success: true };
      case 'sneak':   bot.setControlState('sneak', true);   return { success: true };
      case 'sprint':  bot.setControlState('sprint', true);  return { success: true };
      case 'stop':
        bot.clearControlStates();
        if (bot.pathfinder) { bot.pathfinder.stop(); bot.pathfinder.setGoal(null); }
        return { success: true };

      // ═══════════════════════════════════════════
      // Look & Target
      // ═══════════════════════════════════════════
      case 'look_at': {
        if (action.params?.x == null) return { success: false, error: 'no target' };
        bot.lookAt({ x: action.params.x, y: action.params.y, z: action.params.z }, action.params?.force);
        return { success: true };
      }
      case 'look': {
        if (action.params?.yaw == null) return { success: false, error: 'no yaw' };
        bot.look(action.params.yaw, action.params.pitch || 0, true);
        return { success: true };
      }

      // ═══════════════════════════════════════════
      // World Interaction (Mineflayer API)
      // ═══════════════════════════════════════════
      case 'dig': {
        if (!action.params?.position && typeof bot.dig === 'function') {
          // Backward compat: dig the block the bot is looking at
          const target = bot.blockAt?.(bot.entity.position);
          if (target) { await bot.dig(target); return { success: true }; }
          return { success: false, error: 'no block to dig' };
        }
        if (!action.params?.position) return { success: false, error: 'no block position' };
        const block = bot.blockAt(action.params.position);
        if (!block) return { success: false, error: 'block not loaded' };
        await bot.dig(block);
        return { success: true };
      }
      case 'attack': {
        const target = entities?.[action.params?.entityId];
        if (!target) return { success: false, error: 'no target' };
        bot.attack(target);
        return { success: true };
      }
      case 'place_block': {
        if (!action.params?.position && !action.params?.blockType) {
          // Backward compat: place at feet if called without params
          if (bot.blockAt && bot.entity) {
            const ref = bot.blockAt(bot.entity.position);
            if (ref) { try { await bot.placeBlock(ref, { x: 0, y: 1, z: 0 }); } catch {} }
            return { success: true };
          }
        }
        const ref = bot.blockAt(action.params.position);
        if (!ref) return { success: false, error: 'reference block not found' };
        if (action.params?.blockType) await bot.equip(action.params.blockType, 'hand');
        await bot.placeBlock(ref, action.params?.face || { x: 0, y: 1, z: 0 });
        return { success: true };
      }
      case 'use_block': {
        if (!action.params?.position) return { success: false, error: 'no position' };
        const block = bot.blockAt(action.params.position);
        if (!block) return { success: false, error: 'block not found' };
        bot.activateBlock(block);
        return { success: true };
      }
      case 'use_entity': {
        if (!action.params?.entityId) return { success: false, error: 'no entity' };
        const entity = entities?.[action.params.entityId];
        if (!entity) return { success: false, error: 'entity not found' };
        bot.activateEntity(entity);
        return { success: true };
      }
      case 'swing': bot.swingArm(); return { success: true };

      // ═══════════════════════════════════════════
      // Inventory & Equipment
      // ═══════════════════════════════════════════
      case 'equip': {
        if (!action.params?.item) return { success: false, error: 'no item' };
        // Use mineflayer-tool if available for smart tool selection
        try {
          const toolPlugin = require('mineflayer-tool');
          if (toolPlugin && bot.tool?.equipForBlock) {
            // Tool plugin loaded, use smart equip
            return { success: true, error: 'tool_equip' };
          }
        } catch {}
        await bot.equip(action.params.item, action.params?.destination || 'hand');
        return { success: true };
      }
      case 'drop': {
        if (!action.params?.item) return { success: false, error: 'no item' };
        bot.toss(action.params.item, null, action.params?.count || 1);
        return { success: true };
      }
      case 'drop_stack': {
        if (!action.params?.item) return { success: false, error: 'no item' };
        bot.tossStack(action.params.item);
        return { success: true };
      }

      // ═══════════════════════════════════════════
      // Crafting (prismarine-recipe)
      // ═══════════════════════════════════════════
      case 'craft': {
        try {
          // params.recipe = item name (e.g. 'oak_planks')
          // Handle common name aliases
          const NAME_MAP: Record<string, string> = {
            'planks': 'oak_planks', 'log': 'oak_log', 'wool': 'white_wool', 'bed': 'white_bed',
            'dirt_block': 'dirt', 'netherite_block': 'netherite_block',
          };
          let itemName = action.params?.recipe || action.params?.item;
          if (!itemName) return { success: false, error: 'no item to craft' };
          if (NAME_MAP[itemName]) itemName = NAME_MAP[itemName];
          const reg = bot.registry;
          let item = reg?.itemsByName?.[itemName];
          // Auto-detect variant for generic items (e.g., planks → oak_planks/spruce_planks)
          if (!item && itemName.endsWith('_planks')) {
            // Scan inventory for any log → craft matching planks
            const invItems = bot.inventory?.items() || [];
            const logInInv = invItems.find((i: any) => (i.name.endsWith('_log') || i.name === 'log'));
            if (logInInv) {
              const woodType = logInInv.name.replace('_log', '').replace('log', 'oak');
              const variantItem = reg?.itemsByName?.[`${woodType}_planks`];
              if (variantItem) {
                item = variantItem;
                itemName = `${woodType}_planks`;
              }
            }
          }
          if (!item) {
            const sampleName = Object.keys(reg?.itemsByName || {}).slice(0, 10).join(', ');
            return { success: false, error: `unknown item: ${itemName} (samples: ${sampleName})` };
          }
          const recipes = bot.recipesFor(item.id, 1, null);
          if (!recipes?.length) {
            const invItems = (bot.inventory?.items() || []).map((i: any) => i.name).join(', ');
            return { success: false, error: `no recipe for ${itemName} (inv:${invItems})` };
          }
          // count = times to repeat recipe (not output count)
          // 如果输出>输入 (如1 log→4 planks), 只做1次就够了
          const count = action.params?.count || 1;
          await bot.craft(recipes[0], count, null);
          return { success: true };
        } catch (e: any) { return { success: false, error: e.message }; }
      }

      // ═══════════════════════════════════════════
      // Container Management — handled by backward compat aliases below

      case 'eat':  bot.consume();  return { success: true };
      case 'wake':      bot.wake();     return { success: true };
      case 'fish':      bot.fish();     return { success: true };
      case 'respawn':   bot.respawn();  return { success: true };
      case 'chat': {
        if (!action.params?.message) return { success: false, error: 'no message' };
        bot.chat(action.params.message);
        return { success: true };
      }

      // Navigation (mineflayer-pathfinder)
      case 'goto': {
        if (!action.params?.x || !action.params?.z) return { success: false, error: 'no coords' };
        const { GoalBlock } = require('mineflayer-pathfinder').goals;
        bot.pathfinder.setGoal(new GoalBlock(Math.floor(+action.params.x), Math.floor(+action.params.y || bot.entity.position.y), Math.floor(+action.params.z)));
        return { success: true, error: 'pathfinding' };
      }
      case 'goto_near': {
        if (!action.params?.x || !action.params?.z) return { success: false, error: 'no coords' };
        const { GoalNear } = require('mineflayer-pathfinder').goals;
        bot.pathfinder.setGoal(new GoalNear(Math.floor(+action.params.x), Math.floor(+action.params.y || bot.entity.position.y), Math.floor(+action.params.z), action.params?.range || 2));
        return { success: true, error: 'pathfinding' };
      }
      case 'goto_goal': {
        // Pure movement: brain decides where, adapter only navigates
        const goal = action.params?.goal as string | undefined;
        const y = action.params?.y as number | undefined;
        if (goal === 'find_iron_ore' && y != null) {
          const { GoalNear } = require('mineflayer-pathfinder').goals;
          const px = bot.entity.position.x + (Math.random() - 0.5) * 20;
          const pz = bot.entity.position.z + (Math.random() - 0.5) * 20;
          bot.pathfinder.setGoal(new GoalNear(Math.floor(px), Math.floor(y), Math.floor(pz), 3));
        } else {
          bot.setControlState('forward', true);
        }
        return { success: true };
      }
      case 'find_wood': {
        // OpenCode 式 reaction loop: 每 tick 走一个子步骤, 状态存在 bot 上
        // States: IDLE → PATHFIND → APPROACH → DIG → COLLECT → DONE
        try {
          const Vec3 = require('vec3').Vec3;
          const LOG_IDS = Object.entries(bot.registry.blocksByName)
            .filter(([name]) => name.includes('_log') || name === 'log')
            .map(([, v]: [string, any]) => v.id);
          const pos = bot.entity.position;
          const px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);

          // ── 初始化状态机 ──
          if (!bot._fwState) bot._fwState = { phase: 'SCAN', target: null, digAttempts: 0 };

          const s = bot._fwState;

          // ── STEP 1: SCAN — 找树 ──
          if (s.phase === 'SCAN') {
            // 先扫 5×5×5
            for (let dx = -2; dx <= 2; dx++) {
              for (let dy = -2; dy <= 3; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                  const b = bot.blockAt(new Vec3(px+dx, py+dy, pz+dz));
                  if (!b || !LOG_IDS.includes(b.type) || !bot.canDigBlock(b)) continue;
                  s.target = b.position;
                  s.phase = 'DIG';
                  return { success: true, error: 'found_nearby' };
                }
              }
            }
            // 没有 → 扫 64 格
            const found = bot.findBlocks({ matching: LOG_IDS, maxDistance: 64, count: 1 });
            if (!found?.length) {
              s.phase = 'IDLE';  // SCAN 完了也没有, 下次重新开始
              return { success: false, error: 'no_trees_nearby' };
            }
            s.target = found[0];
            s.phase = 'PATHFIND';
            return { success: true, error: 'found_far' };
          }

          // ── STEP 2: PATHFIND — 走过去 ──
          if (s.phase === 'PATHFIND') {
            if (!s.target) { s.phase = 'SCAN'; return { success: false, error: 'no_target' }; }
            const dist = Math.sqrt((s.target.x-px)**2 + (s.target.y-py)**2 + (s.target.z-pz)**2);
            if (dist <= 3) {
              // 到了
              s.phase = 'DIG';
              return { success: true, error: 'arrived' };
            }
            // 还没到→设 goal (如果还没设或目标变了)
            const { GoalBlock } = require('mineflayer-pathfinder').goals;
            bot.pathfinder.setGoal(new GoalBlock(s.target.x, s.target.y, s.target.z));
            // 等 20 tick 再检查 (2秒左右, setTimeout 串行)
            s.phase = 'APPROACH';
            return { success: true, error: 'pathfinding' };
          }

          // ── STEP 3: APPROACH — 靠近中 ──
          if (s.phase === 'APPROACH') {
            if (!s.target) { s.phase = 'SCAN'; return { success: false, error: 'no_target' }; }
            const dist = Math.sqrt((s.target.x-px)**2 + (s.target.y-py)**2 + (s.target.z-pz)**2);
            if (dist <= 3) {
              s.phase = 'DIG';
              return { success: true, error: 'arrived' };
            }
            // 还没到, 可能是 pathfinder 在走, 检查是否卡住了
            if (bot.pathfinder?.isMoving()) {
              return { success: true, error: 'approaching' };
            }
            // pathfinder 停了但还没到? 重新设 goal
            if (dist > 3) {
              const { GoalBlock } = require('mineflayer-pathfinder').goals;
              bot.pathfinder.setGoal(new GoalBlock(s.target.x, s.target.y, s.target.z));
              return { success: true, error: 'repathfinding' };
            }
            s.phase = 'DIG';
            return { success: true, error: 'arrived' };
          }

          // ── STEP 4: DIG — 挖掘 ──
          if (s.phase === 'DIG') {
            if (bot.targetDigBlock) return { success: true, error: 'digging' };  // 已经在挖
            if (!s.target) { s.phase = 'SCAN'; return { success: false, error: 'no_target' }; }

            // 再检查一次位置
            const dist = Math.sqrt((s.target.x-px)**2 + (s.target.y-py)**2 + (s.target.z-pz)**2);
            if (dist > 4) {
              s.phase = 'APPROACH';  // 走太远了, 重新靠近
              return { success: true, error: 'too_far' };
            }

            const block = bot.blockAt(new Vec3(s.target.x, s.target.y, s.target.z));
            if (!block || !bot.canDigBlock(block)) {
              // 方块不存在了(可能已被破坏) → 回到 SCAN
              s.phase = 'SCAN';
              return { success: false, error: 'block_gone' };
            }

            s.digAttempts++;
            if (s.digAttempts > 5) {
              // 挖了 5 次都失败 → 换个树
              s.phase = 'SCAN';
              s.digAttempts = 0;
              return { success: false, error: 'too_many_retries' };
            }

            await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));
            if (bot.tool) await bot.tool.equipForBlock(block);
            try {
              await bot.dig(block);
            } catch (e: any) {
              if (e.message?.includes('Digging aborted')) {
                return { success: true, error: 'dig_aborted_retry' };
              }
              throw e;
            }
            // 挖完了
            s.phase = 'COLLECT';
            return { success: true, error: 'dug' };
          }

          // ── STEP 5: COLLECT — 收集掉落的物品 ──
          if (s.phase === 'COLLECT') {
            // 检查背包是否有新木头
            const hasLog = bot.inventory?.items()?.some((i: any) =>
              i.name.includes('log') || i.name.endsWith('_log')
            );
            if (hasLog) {
              // 成功了! 重置状态机
              bot._fwState = null;
              bot.pathfinder?.setGoal(null);
              return { success: true };
            }
            // 还没捡到? 试 collectBlock
            if (s.target) {
              const block = bot.blockAt(new Vec3(s.target.x, s.target.y, s.target.z));
              if (block && bot.collectBlock) {
                try { await bot.collectBlock.collect([block]); } catch {}
              }
            }
            // 还没捡到 → 回到 SCAN 再来
            s.phase = 'SCAN';
            return { success: true, error: 'waiting_collect' };
          }

          // ── IDLE / 默认: 重新开始 ──
          s.phase = 'SCAN';
          return { success: true, error: 'restart' };

        } catch (e: any) {
          bot._fwState = null;  // 出错时重置状态机
          return { success: false, error: e.message };
        }
      }

      case 'dig_nearby': {
        try {
          const Vec3 = require('vec3').Vec3;
          const x = action.params?.x as number | undefined;
          const y = action.params?.y as number | undefined;
          const z = action.params?.z as number | undefined;
          let targetBlock = null;
          if (x != null && y != null && z != null) {
            targetBlock = bot.blockAt(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z)));
          }
          if (!targetBlock) {
            const pos = bot.entity.position;
            const px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);
            // Full 5×5×5 volume scan (includes trees above, ores below, dirt around)
            // Priority order: logs first (tool chain), then ores, then stone/dirt
            let best: any = null;
            let bestPriority = 99;
            for (let dx = -2; dx <= 2; dx++) {
              for (let dy = -2; dy <= 3; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                  const b = bot.blockAt(new Vec3(px+dx, py+dy, pz+dz));
                  if (!b) continue;
                  const name = b.name;
                  const isLog = name.includes('log');
                  const isOre = name.includes('ore') || ['stone', 'diorite', 'andesite', 'granite', 'coal_ore', 'copper_ore', 'iron_ore'].includes(name);
                  const isBase = name === 'dirt' || name === 'gravel';
                  if (!isLog && !isOre && !isBase) continue;
                  if (!bot.canDigBlock(b)) continue;
                  const pri = isLog ? 0 : isOre ? 1 : 2;
                  if (pri < bestPriority) { bestPriority = pri; best = b; }
                }
              }
            }
            targetBlock = best;
          }
          if (targetBlock && bot.canDigBlock(targetBlock)) {
            if (bot.tool) await bot.tool.equipForBlock(targetBlock);
            await bot.dig(targetBlock);
            if (bot.collectBlock) bot.collectBlock.collect([targetBlock]).catch(() => {});
            return { success: true };
          }
        } catch {}
        return { success: false };  // silent fail — expected when no blocks nearby
      }
      case 'equip_armor': {
        try { if (bot.armorManager) bot.armorManager.equip(); } catch {}
        return { success: true };
      }
      case 'follow': {
        if (!action.params?.player) return { success: false, error: 'no player' };
        const target = bot.players[action.params.player]?.entity;
        if (!target) return { success: false, error: 'player not visible' };
        const { GoalFollow } = require('mineflayer-pathfinder').goals;
        bot.pathfinder.setGoal(new GoalFollow(target, action.params?.range || 3), true);
        return { success: true, error: 'following' };
      }
      case 'stop_path': {
        if (bot.pathfinder) { bot.pathfinder.stop(); bot.pathfinder.setGoal(null); }
        return { success: true };
      }

      // Backward compatibility aliases (before default fallback)
      case 'move_forward':    bot.setControlState('forward', true); return { success: true };
      case 'move_back':       bot.setControlState('back', true);    return { success: true };
      case 'move_left':       bot.setControlState('left', true);    return { success: true };
      case 'move_right':      bot.setControlState('right', true);   return { success: true };
      case 'wander': {
        // Simple forward movement with random direction changes
        // NOT using pathfinder — pathfinder GoalNear triggers chunk loading
        // which causes the server to disconnect (ECONNABORTED)
        const now = Date.now();
        if (!bot._nextWanderTurn || now > bot._nextWanderTurn) {
          // Random new direction
          bot.setControlState('forward', true);
          bot.look(Math.random() * Math.PI * 2, 0);
          bot._nextWanderTurn = now + 3000 + Math.random() * 4000;
        }
        return { success: true };
      }
      case 'set_quickbar':
        if (action.params?.slot != null) bot.setQuickBarSlot(action.params.slot);
        return { success: true };
      case 'eat_food':
      case 'seek_food':
        try {
          // Cooldown: only try to eat/hunt every 2s to avoid double-consume crash
          const now = Date.now();
          if (bot._lastEat && now - bot._lastEat < 2000) {
            return { success: true, error: 'cooldown' };
          }
          const foodItem = bot.inventory.items().find((i: any) => {
            const n = i.name || '';
            return n.includes('bread')||n.includes('apple')||n.includes('cooked')||
              n.includes('porkchop')||n.includes('beef')||n.includes('chicken')||
              n.includes('mutton')||n.includes('rabbit')||n.includes('potato')||
              n.includes('carrot')||n.includes('cake')||n.includes('cookie')||
              n.includes('pie')||n.includes('soup')||n.includes('stew')||
              n.includes('fish')||n.includes('salmon')||n.includes('melon')||
              n.includes('berry')||n.includes('mushroom')||n.includes('golden');
          });
          if (foodItem && bot.food < 20 && !bot.usingHeldItem) {
            try {
              await bot.equip(foodItem, 'hand');
              await bot.consume();
              bot._lastEat = now;
              return { success: true, error: 'ate' };
            } catch {}
          }
          const prey = ['cow','pig','chicken','sheep','rabbit','mooshroom'];
          const target = bot.nearestEntity((e: any) => prey.includes(e.name));
          if (target) {
            bot._lastEat = now;
            if (bot.pvp) bot.pvp.attack(target); else bot.attack(target);
            return { success: true, error: 'hunted' };
          }
          return { success: false, error: 'no_food_source' };
        } catch { return { success: false, error: 'seek_food_error' }; }
      case 'flee':
        bot.setControlState('sprint', true);
        bot.setControlState('forward', true);
        bot.setControlState('jump', true);
        return { success: true };
      case 'move_to_surface': bot.setControlState('jump', true); return { success: true };
      case 'move_to_water':   bot.setControlState('forward', true); return { success: true };
      case 'swing_arm':       bot.swingArm(action.params?.hand); return { success: true };
      case 'dismount':        bot.dismount(); return { success: true };
      case 'craft_tool':
        if (action.params?.recipe) await bot.craft(action.params.recipe, 1);
        else bot.setControlState('forward', true);
        return { success: true };
      case 'stop_digging':    bot.stopDigging(); return { success: true };
      case 'accept_resource_pack': bot.acceptResourcePack(); return { success: true };
      case 'deny_resource_pack':   bot.denyResourcePack();   return { success: true };
      case 'open_chest':     if (action.params?.block) bot.openChest(action.params.block); return { success: true };
      case 'open_container': if (action.params?.block) bot.openContainer(action.params.block); return { success: true };
      case 'open_furnace':   if (action.params?.block) bot.openFurnace(action.params.block); return { success: true };
      case 'activate_block': if (action.params?.block) bot.activateBlock(action.params.block); return { success: true };
      case 'activate_entity': if (action.params?.entity) bot.activateEntity(action.params.entity); return { success: true };
      case 'use_on':         if (action.params?.entity) bot.useOn(action.params.entity); return { success: true };
      case 'use_block':      if (action.params?.block) bot.activateBlock(action.params.block); return { success: true };
      case 'mount':          if (action.params?.entity) bot.mount(action.params.entity); return { success: true };
      case 'open_villager':  if (action.params?.entity) bot.openVillager(action.params.entity); return { success: true };
      case 'find_block':     if (action.params?.type) bot.findBlock(action.params); return { success: true };
      case 'find_blocks':    if (action.params?.type) bot.findBlocks(action.params); return { success: true };
      case 'toss':           if (action.params?.item) bot.toss(action.params.item, action.params?.metadata ?? null, action.params?.count ?? 1); return { success: true };
      case 'toss_stack':     if (action.params?.item) bot.tossStack(action.params.item); return { success: true };
      case 'update_sign':    if (action.params?.block && action.params?.text != null) bot.updateSign(action.params.block, action.params.text, action.params?.back); return { success: true };
      case 'move_vehicle':   if (action.params?.left != null) bot.moveVehicle(action.params.left, action.params?.forward ?? 0); return { success: true };

      case 'sleep': {
        // Find nearest bed and sleep
        try {
          const bed = bot.findBlock({ matching: (block: any) => bot.isABed(block), maxDistance: 16 });
          if (bed) { await bot.sleep(bed); return { success: true }; }
        } catch {}
        bot.chat("Can't sleep, no bed nearby");
        return { success: false, error: 'no bed nearby' };
      }
      default: {
        if (typeof bot[action.action] === 'function') {
          bot[action.action](...(action.params ? [action.params] : []));
          return { success: true };
        }
        return { success: false, error: `unknown action: ${action.action}` };
      }
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Wave-aware action priority modulation.
 * Returns multiplier (1.0-1.5) based on alignment between dominant Maslow need and action.
 * L1 (physiological) → survival actions boosted
 * L2 (safety) → safety actions boosted
 * L5 (curiosity) → exploration actions boosted
 */
export function modulatePriority(
  action: string,
  dominant: { level: number; intensity: number } | null,
): number {
  if (!dominant) return 1.0;
  const { level, intensity } = dominant;

  const SURVIVAL_ACTIONS = new Set(['seek_food', 'flee', 'place_block']);
  const SAFETY_ACTIONS = new Set(['flee', 'build_shelter', 'move_to_surface']);
  const EXPLORE_ACTIONS = new Set(['wander', 'explore']);

  let boost = 0;
  if (level === 1 && SURVIVAL_ACTIONS.has(action)) boost = intensity;
  if (level === 2 && SAFETY_ACTIONS.has(action)) boost = intensity;
  if (level === 5 && EXPLORE_ACTIONS.has(action)) boost = intensity;

  return boost > 0 ? 1.0 + Math.min(boost * 0.55, 0.5) : 1.0;
}
