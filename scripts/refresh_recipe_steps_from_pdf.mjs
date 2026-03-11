import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from '../src/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../src/data.js');

const PDF_PATH = 'C:/Users/Albert Fang/Documents/recipe.pdf';
const PAGE_FIRST = 42;
const PAGE_LAST = 887;

const FOOTER_RE = /^\s*[-–]?\s*\d+\s*\/\s*\d+\s*[-–]?\s*The Unlicense\s*$/gim;
const HEADING_RE = /^\s*3(?:\.\d+)*\s+.*$/gm;
const TITLE_LINE_RE = /^([\u4e00-\u9fa5A-Za-z0-9·()（）\-、]{2,40})的做法$/gm;

const STEP_SECTION_START_TOKENS = ['操作', '制作步骤', '做法步骤', '步骤'];
const STEP_SECTION_END_TOKENS = ['附加内容', '小贴士', '版权说明', '预估烹饪难度', '制作时长约为', '制作时长', '每份', '总量', '计算'];
const STEP_LINE_NOISE_RE = /^(计算|每份|总量|按照|预估烹饪难度|制作时长约为|制作时长|附加内容|小贴士|版权说明|必备原料和工具)$/;
const STEP_INDEX_RE = /^\s*(?:步骤\s*\d+|第[一二三四五六七八九十百千]+步|\d+\s*[\.、\)]|[①②③④⑤⑥⑦⑧⑨⑩])\s*/;

function normalizePageText(input) {
  return input
    .replace(/\r/g, '')
    .replace(FOOTER_RE, '')
    .replace(HEADING_RE, '')
    .replace(/[•·]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildRecipeEntries(pages) {
  const entries = [];
  let current = null;

  for (const page of pages) {
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

  return entries;
}

function parseSectionByToken(text, startTokens, endTokens) {
  let startIndex = -1;
  let startToken = '';

  for (const token of startTokens) {
    const index = text.indexOf(token);
    if (index >= 0 && (startIndex < 0 || index < startIndex)) {
      startIndex = index;
      startToken = token;
    }
  }

  if (startIndex < 0) {
    return '';
  }

  const tail = text.slice(startIndex + startToken.length);
  let endIndex = tail.length;

  for (const token of endTokens) {
    const index = tail.indexOf(token);
    if (index >= 0 && index < endIndex) {
      endIndex = index;
    }
  }

  return tail.slice(0, endIndex).trim();
}

function normalizeStepLine(rawLine) {
  return rawLine
    .replace(/[•·]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripStepPrefix(line) {
  return line.replace(STEP_INDEX_RE, '').trim();
}

function isStepStart(rawLine, cleanLine) {
  if (STEP_INDEX_RE.test(rawLine)) {
    return true;
  }

  if (/^(制作|调制|准备)/.test(cleanLine) && cleanLine.length <= 8) {
    return true;
  }

  return false;
}

function shouldMergeWithPrevious(previousStep, currentLine) {
  if (!previousStep) {
    return false;
  }

  if (currentLine.length <= 2) {
    return true;
  }

  return /[，、：（(]$/.test(previousStep);
}

function parseStepsFromText(text) {
  const stepsSection = parseSectionByToken(text, STEP_SECTION_START_TOKENS, STEP_SECTION_END_TOKENS);
  if (!stepsSection) {
    return [];
  }

  const steps = [];

  for (const rawLine of stepsSection.split('\n')) {
    const normalizedRaw = normalizeStepLine(rawLine);
    if (!normalizedRaw) {
      continue;
    }

    const cleanLine = stripStepPrefix(normalizedRaw);
    if (!cleanLine || STEP_LINE_NOISE_RE.test(cleanLine)) {
      continue;
    }

    const isStart = isStepStart(normalizedRaw, cleanLine);
    const previousStep = steps[steps.length - 1];

    if (!isStart && shouldMergeWithPrevious(previousStep, cleanLine)) {
      steps[steps.length - 1] = `${previousStep}${cleanLine}`;
      continue;
    }

    steps.push(cleanLine);
  }

  const deduped = [];
  for (const step of steps) {
    if (deduped[deduped.length - 1] !== step) {
      deduped.push(step);
    }
  }

  return deduped;
}

function toJsExport(name, value) {
  return `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;
}

async function main() {
  const parser = new PDFParse({ data: fs.readFileSync(PDF_PATH) });
  const out = await parser.getText({ first: PAGE_FIRST, last: PAGE_LAST });
  await parser.destroy();

  const entries = buildRecipeEntries(out.pages);
  const entryByTitle = new Map();

  for (const entry of entries) {
    if (!entryByTitle.has(entry.title) || entry.text.length > entryByTitle.get(entry.title).text.length) {
      entryByTitle.set(entry.title, entry);
    }
  }

  let matchedRecipes = 0;
  let updatedRecipes = 0;
  let increasedStepCount = 0;

  const nextRecipes = RECIPES.map((recipe) => {
    const entry = entryByTitle.get(recipe.name);
    if (!entry) {
      return recipe;
    }

    matchedRecipes += 1;
    const parsedSteps = parseStepsFromText(entry.text);

    if (parsedSteps.length === 0) {
      return recipe;
    }

    const previousSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
    const changed = JSON.stringify(previousSteps) !== JSON.stringify(parsedSteps);

    if (!changed) {
      return recipe;
    }

    updatedRecipes += 1;
    if (parsedSteps.length > previousSteps.length) {
      increasedStepCount += 1;
    }

    return {
      ...recipe,
      steps: parsedSteps,
    };
  });

  const output = `${toJsExport('CATEGORY_LABELS', CATEGORY_LABELS)}\n${toJsExport(
    'DEFAULT_INGREDIENTS',
    DEFAULT_INGREDIENTS,
  )}\n${toJsExport('RECIPES', nextRecipes)}`;

  fs.writeFileSync(DATA_PATH, output, 'utf8');

  const avgBefore =
    RECIPES.reduce((sum, recipe) => sum + (Array.isArray(recipe.steps) ? recipe.steps.length : 0), 0) / RECIPES.length;
  const avgAfter =
    nextRecipes.reduce((sum, recipe) => sum + (Array.isArray(recipe.steps) ? recipe.steps.length : 0), 0) /
    nextRecipes.length;

  console.log(`PDF recipe entries: ${entries.length}`);
  console.log(`Matched existing recipes: ${matchedRecipes}`);
  console.log(`Recipes with step updates: ${updatedRecipes}`);
  console.log(`Recipes with increased step count: ${increasedStepCount}`);
  console.log(`Average steps: ${avgBefore.toFixed(2)} -> ${avgAfter.toFixed(2)}`);
  console.log(`Updated file: ${DATA_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
