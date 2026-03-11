import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from '../src/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_PATH = 'C:/Users/Albert Fang/Documents/recipe.pdf';
const PAGE_FIRST = 42;
const PAGE_LAST = 887;

const FOOTER_RE = /^\s*[-–]?\s*\d+\s*\/\s*\d+\s*[-–]?\s*The Unlicense\s*$/gim;
const HEADING_RE = /^\s*3(?:\.\d+)*\s+.*$/gm;
const TITLE_LINE_RE = /^([\u4e00-\u9fa5A-Za-z0-9·()（）\-、]{2,30})的做法$/gm;

const seasoningKeywords = [
  '盐',
  '糖',
  '白砂糖',
  '冰糖',
  '酱油',
  '生抽',
  '老抽',
  '蚝油',
  '料酒',
  '醋',
  '胡椒',
  '胡椒粉',
  '孜然',
  '鸡精',
  '味精',
  '香油',
  '芝麻油',
  '辣椒油',
  '豆瓣酱',
  '番茄酱',
  '淀粉',
  '玉米淀粉',
  '食用油',
  '菜籽油',
  '花生油',
  '橄榄油',
  '豆豉',
  '芝麻酱',
  '十三香',
  '花椒',
  '八角',
  '香叶',
  '桂皮',
  '白胡椒',
];

const meatKeywords = [
  '牛',
  '猪',
  '羊',
  '鸡',
  '鸭',
  '鹅',
  '鱼',
  '虾',
  '蟹',
  '贝',
  '排骨',
  '肉',
  '火腿',
  '培根',
  '腊肠',
  '腊肉',
  '鸡翅',
  '鸡腿',
  '鸡胸',
  '牛腩',
  '牛肉',
  '猪肉',
  '里脊',
  '五花肉',
  '肉末',
  '肉片',
  '肉丝',
  '鸡柳',
];

const vegetablePattern = /(菜|豆|瓜|笋|椒|菇|葱|蒜|姜|番茄|西红柿|土豆|茄子|黄瓜|莴笋|萝卜|南瓜|花菜|西兰花|包菜|白菜|油麦菜|空心菜|娃娃菜|生菜|木耳|金针菇|香菇|豆腐|藕|毛豆|玉米|芹菜|四季豆|青椒|辣椒|洋葱|冬瓜|山药|莲藕|海带|紫菜|豆芽|菠菜|韭菜|香菜|苋菜|芥蓝|西葫芦|丝瓜|苦瓜|茼蒿|香椿|豆角|豌豆|菜心)/;

function normalizePageText(input) {
  return input
    .replace(/\r/g, '')
    .replace(FOOTER_RE, '')
    .replace(HEADING_RE, '')
    .replace(/[•·]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeIngredientName(raw) {
  const cleaned = raw
    .replace(/[•]/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[:：]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const fragment = cleaned.split(/[，,、/]/)[0].trim();

  if (!fragment) {
    return '';
  }

  if (/^[0-9]+$/.test(fragment)) {
    return '';
  }

  if (fragment.length > 20) {
    return '';
  }

  if (/^(计算|操作|每份|总量|按照|每次|注意|附加内容|预估烹饪难度)$/.test(fragment)) {
    return '';
  }

  return fragment;
}

function isSeasoning(name) {
  return seasoningKeywords.some((keyword) => name.includes(keyword));
}

function isMeat(name) {
  if (!name) {
    return false;
  }

  if (name.includes('鸡蛋') || name.includes('鸭蛋') || name.includes('鹌鹑蛋') || name.includes('皮蛋')) {
    return false;
  }

  return meatKeywords.some((keyword) => name.includes(keyword));
}

function isVegetable(name) {
  if (!name) {
    return false;
  }

  if (isSeasoning(name) || isMeat(name)) {
    return false;
  }

  return vegetablePattern.test(name);
}

function parseSection(text, startToken, endTokens) {
  const startIndex = text.indexOf(startToken);
  if (startIndex < 0) {
    return '';
  }

  const begin = startIndex + startToken.length;
  const tail = text.slice(begin);

  let endIndex = tail.length;
  for (const token of endTokens) {
    const idx = tail.indexOf(token);
    if (idx >= 0 && idx < endIndex) {
      endIndex = idx;
    }
  }

  return tail.slice(0, endIndex).trim();
}

function parseIngredientCandidates(sectionText) {
  const candidates = [];
  const seen = new Set();

  for (const line of sectionText.split('\n')) {
    const normalizedLine = line.trim();
    if (!normalizedLine) {
      continue;
    }

    const lineParts = normalizedLine
      .split(/[，,、/]/)
      .map((part) => normalizeIngredientName(part))
      .filter(Boolean);

    for (const part of lineParts) {
      if (part.length < 1) {
        continue;
      }

      if (/\d/.test(part) && part.length > 6) {
        continue;
      }

      if (!seen.has(part)) {
        seen.add(part);
        candidates.push(part);
      }
    }
  }

  return candidates;
}

function parseCookTime(text) {
  const range = text.match(/(\d{1,3})\s*[-~到]\s*(\d{1,3})\s*分钟/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return Math.max(5, Math.round((min + max) / 2));
  }

  const single = text.match(/(?:预计|预估|约|大约|制作时长约为|需要)\s*(\d{1,3})\s*分钟/);
  if (single) {
    return Math.max(5, Number(single[1]));
  }

  return 20;
}

function parseDifficulty(text) {
  const match = text.match(/预估烹饪难度：([★☆]+)/);
  if (!match) {
    return '中等';
  }

  const stars = [...match[1]].filter((char) => char === '★').length;
  if (stars <= 2) {
    return '简单';
  }

  if (stars === 3) {
    return '中等';
  }

  return '困难';
}

function parseSummary(title, text) {
  const afterTitle = text.split(`${title}的做法`).slice(1).join(`${title}的做法`).trim();
  if (!afterTitle) {
    return `${title}，收录自 PDF 菜谱。`;
  }

  const beforeDifficulty = afterTitle.split('预估烹饪难度')[0].trim();
  const compact = beforeDifficulty.replace(/\s+/g, ' ').trim();

  if (!compact) {
    return `${title}，收录自 PDF 菜谱。`;
  }

  return compact.slice(0, 80);
}

function parseSteps(text) {
  const stepsSection = parseSection(text, '操作', ['附加内容', '小贴士', '版权说明']);
  if (!stepsSection) {
    return ['参考原文步骤进行烹饪。'];
  }

  const steps = [];
  const seen = new Set();

  for (const rawLine of stepsSection.split('\n')) {
    const line = rawLine.replace(/[•]/g, '').replace(/\s+/g, ' ').trim();
    if (!line) {
      continue;
    }

    if (/^(计算|每份|总量|按照|预估烹饪难度)/.test(line)) {
      continue;
    }

    if (line.length < 4 || line.length > 120) {
      continue;
    }

    if (!seen.has(line)) {
      seen.add(line);
      steps.push(line);
    }
  }

  if (steps.length === 0) {
    return ['参考原文步骤进行烹饪。'];
  }

  return steps.slice(0, 10);
}

function sanitizeForId(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function classifyCategory(title, meats) {
  if (meats.length > 0) {
    return '荤菜';
  }

  if (title.includes('汤') || title.includes('羹')) {
    return '汤羹';
  }

  if (title.includes('凉拌') || title.includes('白灼')) {
    return '凉菜';
  }

  return '素菜';
}

function buildTags(title, meats) {
  const tags = ['PDF导入'];

  if (meats.length > 0) {
    tags.push('荤菜');
  } else {
    tags.push('素菜');
  }

  if (title.includes('凉拌') || title.includes('白灼')) {
    tags.push('凉菜');
  }

  if (title.includes('汤') || title.includes('羹')) {
    tags.push('汤羹');
  }

  return [...new Set(tags)];
}

function toJsExport(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
}

async function main() {
  const parser = new PDFParse({ data: fs.readFileSync(PDF_PATH) });
  const out = await parser.getText({ first: PAGE_FIRST, last: PAGE_LAST });
  await parser.destroy();

  const entries = [];
  let current = null;

  for (const page of out.pages) {
    const cleanText = normalizePageText(page.text);
    if (!cleanText) {
      continue;
    }

    TITLE_LINE_RE.lastIndex = 0;
    const titleMatches = [...cleanText.matchAll(TITLE_LINE_RE)];

    if (titleMatches.length === 0) {
      if (current) {
        current.text += `\n${cleanText}`;
        current.pages.push(page.num);
      }
      continue;
    }

    if (current) {
      const prefix = cleanText.slice(0, titleMatches[0].index).trim();
      if (prefix) {
        current.text += `\n${prefix}`;
      }
      entries.push(current);
      current = null;
    }

    for (let i = 0; i < titleMatches.length; i += 1) {
      const match = titleMatches[i];
      const title = match[1].trim();
      const startIndex = match.index;
      const endIndex = i + 1 < titleMatches.length ? titleMatches[i + 1].index : cleanText.length;
      const chunk = cleanText.slice(startIndex, endIndex).trim();

      if (current) {
        entries.push(current);
      }

      current = {
        title,
        text: chunk,
        pages: [page.num],
      };
    }
  }

  if (current) {
    entries.push(current);
  }

  const existingNames = new Set(RECIPES.map((recipe) => recipe.name));
  const existingIds = new Set(RECIPES.map((recipe) => recipe.id));

  const generatedRecipes = [];
  const generatedRecipeNames = new Set();

  for (const entry of entries) {
    const title = entry.title;

    if (!title || existingNames.has(title) || generatedRecipeNames.has(title)) {
      continue;
    }

    const summary = parseSummary(title, entry.text);
    const ingredientsSection = parseSection(entry.text, '必备原料和工具', ['计算', '操作', '附加内容']);
    const candidates = parseIngredientCandidates(ingredientsSection);

    const vegetables = [];
    const meats = [];
    const otherIngredients = [];
    const seasonings = [];

    for (const ingredient of candidates) {
      if (isSeasoning(ingredient)) {
        if (!seasonings.includes(ingredient)) {
          seasonings.push(ingredient);
        }
        continue;
      }

      if (isMeat(ingredient)) {
        if (!meats.includes(ingredient)) {
          meats.push(ingredient);
        }
        continue;
      }

      if (isVegetable(ingredient)) {
        if (!vegetables.includes(ingredient)) {
          vegetables.push(ingredient);
        }
        continue;
      }

      if (!otherIngredients.includes(ingredient)) {
        otherIngredients.push(ingredient);
      }
    }

    if (seasonings.length === 0) {
      seasonings.push('盐');
    }

    const steps = parseSteps(entry.text);
    const cookTime = parseCookTime(entry.text);
    const difficulty = parseDifficulty(entry.text);
    const category = classifyCategory(title, meats);
    const tags = buildTags(title, meats);

    let idSeed = sanitizeForId(`recipe_pdf_${title}`);
    if (!idSeed) {
      idSeed = `recipe_pdf_${generatedRecipes.length + 1}`;
    }

    let finalId = idSeed;
    let suffix = 2;
    while (existingIds.has(finalId)) {
      finalId = `${idSeed}_${suffix}`;
      suffix += 1;
    }
    existingIds.add(finalId);

    generatedRecipes.push({
      id: finalId,
      name: title,
      category,
      summary,
      vegetables,
      meats,
      otherIngredients,
      seasonings,
      steps,
      cookTime,
      difficulty,
      tags,
    });

    generatedRecipeNames.add(title);
  }

  const existingVegetableNames = new Set(
    DEFAULT_INGREDIENTS.filter((item) => item.category === 'vegetable').map((item) => item.name),
  );
  const existingMeatNames = new Set(DEFAULT_INGREDIENTS.filter((item) => item.category === 'meat').map((item) => item.name));

  const newVegetables = [...new Set(generatedRecipes.flatMap((recipe) => recipe.vegetables))].filter(
    (name) => !existingVegetableNames.has(name),
  );
  const newMeats = [...new Set(generatedRecipes.flatMap((recipe) => recipe.meats))].filter((name) => !existingMeatNames.has(name));

  const addedIngredients = [];
  newVegetables.forEach((name, index) => {
    addedIngredients.push({
      id: `veg_pdf_${String(index + 1).padStart(3, '0')}`,
      name,
      category: 'vegetable',
      icon: name.slice(0, 1),
      note: 'PDF导入',
      isDefault: true,
      isHidden: false,
    });
  });

  newMeats.forEach((name, index) => {
    addedIngredients.push({
      id: `meat_pdf_${String(index + 1).padStart(3, '0')}`,
      name,
      category: 'meat',
      icon: name.slice(0, 1),
      note: 'PDF导入',
      isDefault: true,
      isHidden: false,
    });
  });

  const mergedIngredients = [...DEFAULT_INGREDIENTS, ...addedIngredients];
  const mergedRecipes = [...RECIPES, ...generatedRecipes];

  const targetPath = path.resolve(__dirname, '../src/data.js');
  const output = `${toJsExport('CATEGORY_LABELS', CATEGORY_LABELS)}\n${toJsExport('DEFAULT_INGREDIENTS', mergedIngredients)}\n${toJsExport('RECIPES', mergedRecipes)}`;
  fs.writeFileSync(targetPath, output, 'utf8');

  console.log(`Imported pages: ${PAGE_FIRST}-${PAGE_LAST}`);
  console.log(`Recognized recipe blocks: ${entries.length}`);
  console.log(`Added recipes: ${generatedRecipes.length}`);
  console.log(`Added vegetable ingredients: ${newVegetables.length}`);
  console.log(`Added meat ingredients: ${newMeats.length}`);
  console.log(`Updated file: ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
