// CraftingKnowledge — recipe lookup table + tool progression
// Human analog: semantic memory (factual knowledge about crafting)

export interface Ingredient {
  item: string;
  count: number;
}

export interface Recipe {
  result: string;
  count: number;
  ingredients: Ingredient[];
  needsTable: boolean;
}

const TOOL_TIER: Record<string, string> = {
  wooden_pickaxe: 'stone_pickaxe',
  stone_pickaxe: 'iron_pickaxe',
  iron_pickaxe: 'diamond_pickaxe',
  diamond_pickaxe: 'netherite_pickaxe',
};

// Note: item names must match mineflayer's minecraft-data registry
// (e.g. 'oak_planks' not 'planks', 'white_bed' not 'bed')
const RECIPES: Record<string, Recipe> = {
  planks:           { result: 'oak_planks', count: 4, ingredients: [{ item: 'oak_log', count: 1 }], needsTable: false },
  stick:            { result: 'stick', count: 4, ingredients: [{ item: 'oak_planks', count: 2 }], needsTable: false },
  crafting_table:   { result: 'crafting_table', count: 1, ingredients: [{ item: 'oak_planks', count: 4 }], needsTable: false },
  furnace:          { result: 'furnace', count: 1, ingredients: [{ item: 'cobblestone', count: 8 }], needsTable: true },
  chest:            { result: 'chest', count: 1, ingredients: [{ item: 'oak_planks', count: 8 }], needsTable: true },
  torch:            { result: 'torch', count: 4, ingredients: [{ item: 'coal', count: 1 }, { item: 'stick', count: 1 }], needsTable: false },
  bread:            { result: 'bread', count: 1, ingredients: [{ item: 'wheat', count: 3 }], needsTable: true },
  wooden_pickaxe:   { result: 'wooden_pickaxe', count: 1, ingredients: [{ item: 'oak_planks', count: 3 }, { item: 'stick', count: 2 }], needsTable: true },
  stone_pickaxe:    { result: 'stone_pickaxe', count: 1, ingredients: [{ item: 'cobblestone', count: 3 }, { item: 'stick', count: 2 }], needsTable: true },
  iron_pickaxe:     { result: 'iron_pickaxe', count: 1, ingredients: [{ item: 'iron_ingot', count: 3 }, { item: 'stick', count: 2 }], needsTable: true },
  diamond_pickaxe:  { result: 'diamond_pickaxe', count: 1, ingredients: [{ item: 'diamond', count: 3 }, { item: 'stick', count: 2 }], needsTable: true },
  netherite_pickaxe:{ result: 'netherite_pickaxe', count: 1, ingredients: [{ item: 'netherite_ingot', count: 3 }, { item: 'stick', count: 2 }], needsTable: true },
  wooden_sword:     { result: 'wooden_sword', count: 1, ingredients: [{ item: 'oak_planks', count: 2 }, { item: 'stick', count: 1 }], needsTable: true },
  stone_sword:      { result: 'stone_sword', count: 1, ingredients: [{ item: 'cobblestone', count: 2 }, { item: 'stick', count: 1 }], needsTable: true },
  iron_sword:       { result: 'iron_sword', count: 1, ingredients: [{ item: 'iron_ingot', count: 2 }, { item: 'stick', count: 1 }], needsTable: true },
  iron_helmet:      { result: 'iron_helmet', count: 1, ingredients: [{ item: 'iron_ingot', count: 5 }], needsTable: true },
  iron_chestplate:  { result: 'iron_chestplate', count: 1, ingredients: [{ item: 'iron_ingot', count: 8 }], needsTable: true },
  bed:              { result: 'white_bed', count: 1, ingredients: [{ item: 'white_wool', count: 3 }, { item: 'oak_planks', count: 3 }], needsTable: true },
  shield:           { result: 'shield', count: 1, ingredients: [{ item: 'iron_ingot', count: 1 }, { item: 'oak_planks', count: 6 }], needsTable: true },
};

export class CraftingKnowledge {
  getRecipe(result: string): Recipe | null {
    return RECIPES[result] ?? null;
  }

  nextToolTier(currentTool: string): string | null {
    return TOOL_TIER[currentTool] ?? null;
  }

  canCraft(recipeName: string, inventory: { item: string; count: number }[]): boolean {
    const recipe = this.getRecipe(recipeName);
    if (!recipe) return false;
    return this.missingMaterials(recipeName, inventory).length === 0;
  }

  /** Check if an item matches a requirement (flexible for wood types) */
  private matchesRequirement(invItem: string, needItem: string): boolean {
    if (invItem === needItem) return true;
    // Flexible plank matching: any *_planks matches oak_planks
    if (needItem === 'oak_planks' && invItem.endsWith('_planks')) return true;
    // Flexible log matching: any *_log matches oak_log
    if (needItem === 'oak_log' && (invItem.endsWith('_log') || invItem === 'log')) return true;
    // Flexible wool matching
    if (needItem === 'white_wool' && invItem.endsWith('wool')) return true;
    return false;
  }

  missingMaterials(recipeName: string, inventory: { item: string; count: number }[]): Ingredient[] {
    const recipe = this.getRecipe(recipeName);
    if (!recipe) return [];
    const missing: Ingredient[] = [];
    for (const need of recipe.ingredients) {
      const have = inventory
        .filter(i => this.matchesRequirement(i.item, need.item))
        .reduce((sum, i) => sum + i.count, 0);
      if (have < need.count) {
        missing.push({ item: need.item, count: need.count - have });
      }
    }
    return missing;
  }

  getAllRecipes(): string[] {
    return Object.keys(RECIPES);
  }

  getToolTier(tool: string): number {
    const tiers = ['wooden', 'stone', 'iron', 'diamond', 'netherite'];
    for (let i = 0; i < tiers.length; i++) {
      if (tool.includes(tiers[i])) return i + 1;
    }
    return 0;
  }
}
