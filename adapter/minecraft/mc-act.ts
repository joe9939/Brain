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
  // Clear previous control states (except for continuous movement)
  const continuous = ['move_forward','move_back','move_left','move_right','wander','flee'];
  if (!continuous.includes(action.action)) bot.clearControlStates();

  switch (action.action) {
    // ═══════════════════════════════════════════
    // Level 1: Reflex (本能, 0 LLM)
    // ═══════════════════════════════════════════
    case 'eat_food':
    case 'seek_food':
      try { bot.consume(); } catch {}
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
    case 'place_block':
    case 'build_shelter':
      if (action.params?.blockType) {
        try { bot.equip(action.params.blockType, 'hand'); } catch {}
      }
      if (bot.blockAt) {
        const pos = bot.entity?.position || { x: 0, y: 64, z: 0 };
        const ref = bot.blockAt(pos);
        if (ref) bot.placeBlock(ref, { x: 0, y: 1, z: 0 });
      }
      break;

    // ═══════════════════════════════════════════
    // Level 2: Motor (基本运动, 0 LLM)
    // ═══════════════════════════════════════════
    case 'move_forward': bot.setControlState('forward', true); break;
    case 'move_back':    bot.setControlState('back', true);    break;
    case 'move_left':    bot.setControlState('left', true);    break;
    case 'move_right':   bot.setControlState('right', true);   break;
    case 'jump':         bot.setControlState('jump', true);    break;
    case 'sneak':        bot.setControlState('sneak', true);   break;
    case 'sprint':       bot.setControlState('sprint', true);  break;
    case 'look_at':
      if (action.params?.x != null)
        bot.lookAt({ x: action.params.x, y: action.params.y, z: action.params.z });
      break;
    case 'set_quickbar':
      if (action.params?.slot != null) bot.setQuickBarSlot(action.params.slot);
      break;
    case 'stop':
    case 'idle':
    case 'none':
      bot.clearControlStates();
      break;

    // ═══════════════════════════════════════════
    // Level 3: Skill (程序技能, HabitLayer学习)
    // ═══════════════════════════════════════════
    case 'attack': {
      const target = entities?.[action.params?.entityId];
      if (target) bot.attack(target);
      break;
    }
    case 'dig':
      if (action.params?.block) bot.dig(action.params.block);
      break;
    case 'craft':
      if (action.params?.recipe) {
        const cnt = action.params?.count ?? 1;
        const table = action.params?.craftingTable;
        bot.craft(action.params.recipe, cnt, table);
      }
      break;
    case 'craft_tool':
      // Simple fallback: try to craft or move
      if (action.params?.recipe) bot.craft(action.params.recipe, 1);
      else bot.setControlState('forward', true);
      break;
    case 'equip':
      if (action.params?.item) bot.equip(action.params.item, action.params?.destination || 'hand');
      break;
    case 'toss':
      if (action.params?.item) bot.toss(action.params.item, action.params?.metadata ?? null, action.params?.count ?? 1);
      break;
    case 'fish':         bot.fish();        break;
    case 'sleep':
      if (action.params?.bed) bot.sleep(action.params.bed);
      break;
    case 'wake':         bot.wake();        break;
    case 'open_chest':
      if (action.params?.block) bot.openChest(action.params.block);
      break;
    case 'open_container':
      if (action.params?.block) bot.openContainer(action.params.block);
      break;
    case 'open_furnace':
      if (action.params?.block) bot.openFurnace(action.params.block);
      break;
    case 'open_enchant':  // enchantment table
      if (action.params?.block) bot.openEnchantmentTable(action.params.block);
      break;
    case 'open_villager':
      if (action.params?.entity) bot.openVillager(action.params.entity);
      break;
    case 'activate_block':
      if (action.params?.block) bot.activateBlock(action.params.block);
      break;
    case 'activate_entity':
      if (action.params?.entity) bot.activateEntity(action.params.entity);
      break;
    case 'use_on':
      if (action.params?.entity) bot.useOn(action.params.entity);
      break;
    case 'swing_arm':
      bot.swingArm(action.params?.hand);
      break;
    case 'mount':
      if (action.params?.entity) bot.mount(action.params.entity);
      break;
    case 'dismount':     bot.dismount();    break;
    case 'move_vehicle':
      if (action.params?.left != null) bot.moveVehicle(action.params.left, action.params?.forward ?? 0);
      break;
    case 'respawn':      bot.respawn();     break;
    case 'stop_digging': bot.stopDigging(); break;
    case 'update_sign':
      if (action.params?.block && action.params?.text != null)
        bot.updateSign(action.params.block, action.params.text, action.params?.back);
      break;

    // ═══════════════════════════════════════════
    // Level 4: Cognitive (认知工具, LLM)
    // ═══════════════════════════════════════════
    case 'chat':
      if (action.params?.message) bot.chat(action.params.message);
      break;
    case 'find_block':
      if (action.params?.type) bot.findBlock(action.params);
      break;
    case 'find_blocks':
      if (action.params?.type) bot.findBlocks(action.params);
      break;
    case 'wander':
      bot.setControlState('forward', true);
      if (Math.random() < 0.05) {
        bot.look(Math.random() * Math.PI * 2, 0, true);
      }
      break;
    case 'accept_resource_pack':  bot.acceptResourcePack();  break;
    case 'deny_resource_pack':    bot.denyResourcePack();    break;
    case 'close_window':          bot.closeWindow(action.params?.window); break;

    default:
      // unknown — no-op
      break;
  }
}
