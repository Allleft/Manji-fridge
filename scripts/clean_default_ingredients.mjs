import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from '../src/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../src/data.js');

const TOOL_OR_NOISE_TOKENS = [
  '菜刀',
  '砧板',
  '平底锅',
  '铁锅',
  '高压锅',
  '蒸箱',
  '微波炉',
  '烤箱',
  '洗菜盆',
  '水龙头',
  '盘子',
  '碗',
  '筷子',
  '勺',
  '铲',
  '搅拌器',
  '配料包',
  '调料包',
  '料包',
];

const NOISE_PHRASE_TOKENS = [
  '推荐',
  '比如',
  '例如',
  '这里',
  '其余',
  '不要',
  '出于',
  '考虑',
  '俗称',
  '代替',
  '介绍',
  '最佳',
  '必须',
  '更好吃',
  '不吃辣',
  '步骤',
  '操作',
  '优先级',
  '标准分量',
  '菜谱',
  '做法',
  '说明',
];

const START_NOISE_PREFIXES = [
  '可选',
  '可选择',
  '可选用',
  '也可选用',
  '建议',
  '推荐',
  '尽量',
  '如果',
  '注',
  '主料',
  '辅料',
  '配菜',
  '配料',
  '调料',
  '蔬菜',
  '肉类',
  '菜类材料',
  '风味调料',
  '必备',
  '原料',
  '材料',
  '其余配菜',
  '其余食材',
  '其余',
  '比如',
  '例如',
  '这里推荐',
  '不要用',
  '不吃辣的用',
];

const CONNECTOR_TOKENS = ['或', '或者', '和', '及', '与', '并且'];

const TRAILING_NOISE_SUFFIXES = [
  '适量',
  '少许',
  '备用',
  '即可',
  '可选',
  '切块',
  '切片',
  '切丝',
  '切丁',
  '切段',
  '切末',
  '洗净',
  '去皮',
  '去骨',
  '去壳',
  '拍碎',
  '剁碎',
  '打碎',
  '焯水',
];

const SEASONING_TOKENS = [
  '盐',
  '糖',
  '鸡精',
  '味精',
  '胡椒',
  '花椒',
  '孜然',
  '豆蔻',
  '小豆蔻',
  '酱',
  '醋',
  '料酒',
  '生抽',
  '老抽',
  '蚝油',
  '耗油',
  '豆瓣',
  '豆豉',
  '豆腐乳',
  '油',
  '红油',
  '葱姜水',
  '蒜蓉酱',
  '辣椒粉',
  '辣椒面',
  '地瓜粉',
  '淀粉',
  '香菜粉',
  '蒜粉',
  '姜粉',
  '姜黄粉',
  '甜椒粉',
  '黑椒',
  '花椒油',
  '藤椒油',
  '玉米油',
  '红葱油',
  '郫县豆瓣',
  '红油豆瓣',
  '豆瓣酱',
];

const SEASONING_SUFFIXES = ['油', '酱', '粉', '汁', '水', '酒', '乳', '膏', '露', '面'];

const MEAT_NAME_REGEX =
  /(牛腩|牛肉|牛排|肥牛|牛筋|牛肚|牛百叶|猪肉|五花肉|排骨|里脊|肉片|肉丝|肉末|鸡翅|鸡腿|鸡胸|鸡肉|鸡爪|鸡胗|鸭肉|鸭血|羊肉|虾|鱼|蟹|贝|鱿|火腿|培根|腊肉|腊肠|猪蹄|猪肝|猪肚|猪耳|蹄筋|鳕鱼|鲈鱼|鲫鱼|鳗鱼)/;

const EXACT_NORMALIZATIONS = new Map([
  ['西红柿', '番茄'],
  ['内脂豆腐', '内酯豆腐'],
  ['花椰菜', '花菜'],
  ['红萝卜', '胡萝卜'],
  ['蒜薹', '蒜苔'],
  ['青红椒', '青椒'],
  ['青红辣椒', '辣椒'],
  ['红尖椒', '尖椒'],
  ['菜椒', '彩椒'],
  ['甜椒', '彩椒'],
  ['灯笼椒', '彩椒'],
  ['葱段', '葱'],
  ['葱花', '葱'],
  ['葱末', '葱'],
  ['小葱花', '葱'],
  ['青葱', '葱'],
  ['香葱', '葱'],
  ['大葱葱白', '葱'],
  ['葱结', '葱'],
  ['葱头', '葱'],
  ['蒜蓉', '蒜'],
  ['蒜末', '蒜'],
  ['蒜片', '蒜'],
  ['蒜瓣', '蒜'],
  ['蒜头', '蒜'],
  ['蒜仔', '蒜'],
  ['生姜', '姜'],
  ['老姜', '姜'],
  ['生姜片', '姜'],
  ['生姜末', '姜'],
  ['姜片', '姜'],
  ['姜末', '姜'],
  ['两片姜片', '姜'],
  ['姜各', '姜'],
  ['火锅牛肉卷', '牛肉片'],
  ['牛肉卷', '牛肉片'],
  ['肥牛片', '牛肉片'],
  ['新鲜玉米', '玉米'],
  ['冷冻玉米粒', '玉米粒'],
  ['冷冻青豆', '青豆'],
  ['东北酸菜', '酸菜'],
  ['酸笋包', '酸笋'],
  ['豆皮包', '豆皮'],
]);

const SALVAGE_PATTERNS = [
  { pattern: /不要用紫色的洋葱/, value: '洋葱' },
  { pattern: /这里推荐芦笋/, value: '芦笋' },
  { pattern: /其余配菜例如马蹄/, value: '马蹄' },
  { pattern: /如菠菜/, value: '菠菜' },
  { pattern: /蔬菜.*土豆片/, value: '土豆' },
  { pattern: /生菜菠菜油麦菜/, value: '生菜' },
];

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function normalizeForDedup(name) {
  return String(name || '')
    .trim()
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s+/g, '')
    .toLocaleLowerCase();
}

function stripPrefix(name, prefixes) {
  let next = name.trim();
  let changed = true;

  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (next.startsWith(prefix)) {
        next = next.slice(prefix.length).trim();
        changed = true;
      }
    }
  }

  return next;
}

function canonicalizeName(rawName) {
  let name = String(rawName || '')
    .replace(/\u3000/g, ' ')
    .replace(/\r/g, '')
    .split('\n')[0]
    .replace(/[•·]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[“”"'`]/g, '')
    .replace(/[。；;:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) {
    return '';
  }

  for (const { pattern, value } of SALVAGE_PATTERNS) {
    if (pattern.test(name)) {
      return value;
    }
  }

  name = stripPrefix(name, START_NOISE_PREFIXES);

  for (const token of ['|', '/', '、', ',', '，', '+', '＋']) {
    if (name.includes(token)) {
      name = name.split(token)[0].trim();
    }
  }

  for (const token of CONNECTOR_TOKENS) {
    if (name.includes(token) && name.length > 3) {
      const split = name.split(token)[0].trim();
      if (split) {
        name = split;
      }
    }
  }

  name = name
    .replace(/\d+(\.\d+)?\s*(g|kg|ml|l|克|千克|毫升|升|个|根|颗|只|把|片|瓣|包|袋|块|勺)$/gi, '')
    .replace(/[）)\]】]/g, '')
    .replace(/[（(\[【]/g, '')
    .replace(/[a-zA-Z]/g, '')
    .replace(/\s+/g, '')
    .trim();

  for (const suffix of TRAILING_NOISE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length).trim();
    }
  }

  if (name.endsWith('包') && (name.includes('配料') || name.includes('调料'))) {
    return '';
  }

  if (name.endsWith('包') && (name.startsWith('酸笋') || name.startsWith('豆皮'))) {
    name = name.slice(0, -1);
  }

  if (name.includes('西红柿')) {
    name = name.replaceAll('西红柿', '番茄');
  }

  if (name.includes('牛肉卷') || name.includes('火锅牛肉卷') || name.includes('肥牛片')) {
    name = '牛肉片';
  }

  if (EXACT_NORMALIZATIONS.has(name)) {
    name = EXACT_NORMALIZATIONS.get(name);
  }

  return name;
}

function isLikelyToolOrNoise(name) {
  return TOOL_OR_NOISE_TOKENS.some((token) => name.includes(token));
}

function isLikelyNoisePhrase(name) {
  return NOISE_PHRASE_TOKENS.some((token) => name.includes(token));
}

function isLikelySeasoning(name) {
  if (
    SEASONING_TOKENS.some((token) => {
      if (token.length <= 2) {
        return name === token;
      }

      return name.includes(token);
    })
  ) {
    return true;
  }

  return SEASONING_SUFFIXES.some((suffix) => name.length <= 4 && name.endsWith(suffix));
}

function isLikelyMeatName(name) {
  return MEAT_NAME_REGEX.test(name);
}

function isInvalidIngredientName(name, category) {
  if (!name) {
    return true;
  }

  if (!containsChinese(name)) {
    return true;
  }

  if (name.length < 1 || name.length > 6) {
    return true;
  }

  if (/[|/+,，。；:：`"'?？！!]/.test(name)) {
    return true;
  }

  if (isLikelyToolOrNoise(name) || isLikelyNoisePhrase(name) || isLikelySeasoning(name)) {
    return true;
  }

  if (category === 'meat') {
    return !isLikelyMeatName(name);
  }

  if (category === 'vegetable') {
    return isLikelyMeatName(name);
  }

  return true;
}

function serializeExport(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
}

function cleanIngredientArray(names, category) {
  const out = [];
  const seen = new Set();

  for (const rawName of names || []) {
    const cleanName = canonicalizeName(rawName);

    if (isInvalidIngredientName(cleanName, category)) {
      continue;
    }

    const key = normalizeForDedup(cleanName);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(cleanName);
  }

  return out;
}

function cleanRecipes() {
  return RECIPES.map((recipe) => ({
    ...recipe,
    vegetables: cleanIngredientArray(recipe.vegetables || [], 'vegetable'),
    meats: cleanIngredientArray(recipe.meats || [], 'meat'),
  }));
}

function collectCandidates(cleanedRecipes) {
  const out = [];

  for (const item of DEFAULT_INGREDIENTS) {
    out.push({
      category: item.category,
      name: item.name,
      icon: item.icon,
      note: item.note,
      id: item.id,
    });
  }

  for (const recipe of cleanedRecipes) {
    for (const name of recipe.vegetables || []) {
      out.push({ category: 'vegetable', name, icon: '', note: '来自菜谱', id: '' });
    }

    for (const name of recipe.meats || []) {
      out.push({ category: 'meat', name, icon: '', note: '来自菜谱', id: '' });
    }
  }

  return out;
}

function main() {
  const cleanedRecipes = cleanRecipes();
  const candidates = collectCandidates(cleanedRecipes);

  const seenByCategory = {
    vegetable: new Set(),
    meat: new Set(),
  };

  let vegSeq = 1;
  let meatSeq = 1;

  const cleaned = [];
  const removedInvalid = [];
  const removedDuplicate = [];

  for (const item of candidates) {
    if (item.category !== 'vegetable' && item.category !== 'meat') {
      continue;
    }

    const cleanName = canonicalizeName(item.name);
    const dedupKey = normalizeForDedup(cleanName);

    if (isInvalidIngredientName(cleanName, item.category)) {
      removedInvalid.push(item.name);
      continue;
    }

    if (seenByCategory[item.category].has(dedupKey)) {
      removedDuplicate.push(item.name);
      continue;
    }

    seenByCategory[item.category].add(dedupKey);

    const fallbackId =
      item.category === 'vegetable'
        ? `veg_clean_${String(vegSeq++).padStart(3, '0')}`
        : `meat_clean_${String(meatSeq++).padStart(3, '0')}`;

    cleaned.push({
      id: item.id || fallbackId,
      name: cleanName,
      category: item.category,
      icon: cleanName.slice(0, 1),
      note: item.note || '常用食材',
      isDefault: true,
      isHidden: false,
    });
  }

  const output = `${serializeExport('CATEGORY_LABELS', CATEGORY_LABELS)}\n${serializeExport(
    'DEFAULT_INGREDIENTS',
    cleaned,
  )}\n${serializeExport('RECIPES', cleanedRecipes)}`;

  fs.writeFileSync(DATA_PATH, output, 'utf8');

  const uniqueInvalid = [...new Set(removedInvalid)];
  const uniqueDuplicate = [...new Set(removedDuplicate)];
  const byCategory = {
    vegetable: cleaned.filter((x) => x.category === 'vegetable').length,
    meat: cleaned.filter((x) => x.category === 'meat').length,
  };

  const recipeVegTotal = cleanedRecipes.reduce((sum, recipe) => sum + recipe.vegetables.length, 0);
  const recipeMeatTotal = cleanedRecipes.reduce((sum, recipe) => sum + recipe.meats.length, 0);

  console.log(`Candidates: ${candidates.length}`);
  console.log(`Ingredients after clean: ${cleaned.length} (veg: ${byCategory.vegetable}, meat: ${byCategory.meat})`);
  console.log(`Removed invalid: ${removedInvalid.length} (unique: ${uniqueInvalid.length})`);
  console.log(`Removed duplicate: ${removedDuplicate.length} (unique: ${uniqueDuplicate.length})`);
  console.log(`Recipe ingredients after clean: vegetables ${recipeVegTotal}, meats ${recipeMeatTotal}`);
  console.log(`Sample invalid removed: ${uniqueInvalid.slice(0, 40).join(' | ')}`);
}

main();
