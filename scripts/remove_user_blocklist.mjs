import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from '../src/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../src/data.js');

const BLOCKED_EXACT_NAMES = [
  '干辣椒',
  '辣椒',
  '姜',
  '辣椒是青辣椒',
  '日本豆腐',
  '小葱',
  '小米椒',
  '蒜',
  '葱姜末',
  '干小米椒',
  '葱姜蒜',
  '辣椒青椒',
  '香菜一颗',
  '子弹头辣椒',
  '俄式酸黄瓜汁',
  '干辣椒碎',
  '玉米粒',
  '剁椒',
  '萝卜干',
  '荤素搭配',
  '香菜叶',
  '鹰嘴豆',
  '择黄瓜',
  '萝卜等',
  '干红椒',
  '洋葱三件套',
  '番茄蕃茄膏',
  '番茄番茄膏',
  '番茄罐头',
  '小香葱',
  '超市',
  '番茄一个',
  '叶菜类蔬菜',
  '菌菇',
  '高汤欧芹',
  '土豆干粉条',
];

const BLOCKED_VEGETABLE_PARTIAL_PATTERNS = [
  /椒/,
  /姜/,
  /蒜/,
  /蕃茄膏|番茄膏|番茄罐头|番茄一个/,
  /洋葱三件套|荤素搭配|超市/,
  /择黄瓜|萝卜等|香菜一颗|香菜叶|玉米粒|萝卜干|俄式酸黄瓜汁|鹰嘴豆/,
  /叶菜类蔬菜|菌菇|高汤欧芹|土豆干粉条/,
];

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, '').toLocaleLowerCase();
}

const BLOCKED_EXACT_NORMALIZED = new Set(BLOCKED_EXACT_NAMES.map((name) => normalizeName(name)));

function isBlockedName(name, category) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return false;
  }

  if (BLOCKED_EXACT_NORMALIZED.has(normalized)) {
    return true;
  }

  if (category === 'vegetable') {
    return BLOCKED_VEGETABLE_PARTIAL_PATTERNS.some((pattern) => pattern.test(name));
  }

  return false;
}

function serializeExport(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
}

function dedupeArray(items) {
  const out = [];
  const seen = new Set();

  for (const item of items || []) {
    const key = normalizeName(item);
    if (!item || seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(item);
  }

  return out;
}

function main() {
  const filteredDefaultIngredients = DEFAULT_INGREDIENTS.filter(
    (item) => !isBlockedName(item.name, item.category),
  );

  const cleanedRecipes = RECIPES.map((recipe) => ({
    ...recipe,
    vegetables: dedupeArray((recipe.vegetables || []).filter((name) => !isBlockedName(name, 'vegetable'))),
    meats: dedupeArray((recipe.meats || []).filter((name) => !isBlockedName(name, 'meat'))),
  }));

  const output = `${serializeExport('CATEGORY_LABELS', CATEGORY_LABELS)}\n${serializeExport(
    'DEFAULT_INGREDIENTS',
    filteredDefaultIngredients,
  )}\n${serializeExport('RECIPES', cleanedRecipes)}`;

  fs.writeFileSync(DATA_PATH, output, 'utf8');

  const removedFromDefault = DEFAULT_INGREDIENTS.length - filteredDefaultIngredients.length;
  const removedFromRecipesVeg = RECIPES.reduce((sum, recipe, index) => {
    return sum + (recipe.vegetables || []).length - cleanedRecipes[index].vegetables.length;
  }, 0);
  const removedFromRecipesMeat = RECIPES.reduce((sum, recipe, index) => {
    return sum + (recipe.meats || []).length - cleanedRecipes[index].meats.length;
  }, 0);

  console.log(`Removed from DEFAULT_INGREDIENTS: ${removedFromDefault}`);
  console.log(`Removed from RECIPES vegetables: ${removedFromRecipesVeg}`);
  console.log(`Removed from RECIPES meats: ${removedFromRecipesMeat}`);
  console.log(`DEFAULT_INGREDIENTS now: ${filteredDefaultIngredients.length}`);
}

main();
