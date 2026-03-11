import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from './data.js';
import { filterRecipesByMeats, filterRecipesByVegetables, getVisibleRecipes } from './filters.js';
import { loadIngredientPreferences, loadPresetRecipeIds, saveIngredientPreferences, savePresetRecipeIds } from './storage.js';

const app = document.querySelector('#app');

const initialPreferences = loadIngredientPreferences();

const state = {
  customIngredients: initialPreferences.customIngredients,
  hiddenIngredientIds: new Set(initialPreferences.hiddenIngredientIds),
  selectedVegetables: new Set(),
  selectedMeats: new Set(),
  ingredientQuery: '',
  recipeQuery: '',
  presetRecipeIds: new Set(loadPresetRecipeIds()),
  activeRecipeId: null,
  modal: {
    isOpen: false,
    category: 'vegetable',
    error: '',
    draft: {
      name: '',
      icon: '',
      note: '',
    },
  },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeIngredientName(name) {
  return String(name || '').trim().replace(/\s+/g, '').toLocaleLowerCase();
}

function normalizeSearchQuery(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function recipeNameMatchesQuery(recipe, query) {
  return normalizeSearchQuery(recipe.name).includes(query);
}

const BLOCKED_INGREDIENT_EXACT_NAMES = [
  '\u5e72\u8fa3\u6912',
  '\u8fa3\u6912',
  '\u59dc',
  '\u8fa3\u6912\u662f\u9752\u8fa3\u6912',
  '\u65e5\u672c\u8c46\u8150',
  '\u5c0f\u8471',
  '\u5c0f\u7c73\u6912',
  '\u849c',
  '\u8471\u59dc\u672b',
  '\u5e72\u5c0f\u7c73\u6912',
  '\u8471\u59dc\u849c',
  '\u8fa3\u6912\u9752\u6912',
  '\u9999\u83dc\u4e00\u9897',
  '\u5b50\u5f39\u5934\u8fa3\u6912',
  '\u4fc4\u5f0f\u9178\u9ec4\u74dc\u6c41',
  '\u5e72\u8fa3\u6912\u788e',
  '\u7389\u7c73\u7c92',
  '\u5241\u6912',
  '\u841d\u535c\u5e72',
  '\u8364\u7d20\u642d\u914d',
  '\u9999\u83dc\u53f6',
  '\u9e70\u5634\u8c46',
  '\u62e9\u9ec4\u74dc',
  '\u841d\u535c\u7b49',
  '\u5e72\u7ea2\u6912',
  '\u6d0b\u8471\u4e09\u4ef6\u5957',
  '\u756a\u8304\u8543\u8304\u818f',
  '\u756a\u8304\u756a\u8304\u818f',
  '\u756a\u8304\u7f50\u5934',
  '\u5c0f\u9999\u8471',
  '\u8d85\u5e02',
  '\u756a\u8304\u4e00\u4e2a',
  '\u53f6\u83dc\u7c7b\u852c\u83dc',
  '\u83cc\u83c7',
  '\u9ad8\u6c64\u6b27\u82b9',
  '\u571f\u8c46\u5e72\u7c89\u6761',
];

const BLOCKED_VEGETABLE_PARTIAL_PATTERNS = [
  /\u6912/,
  /\u59dc/,
  /\u849c/,
  /\u8543\u8304\u818f|\u756a\u8304\u818f|\u756a\u8304\u7f50\u5934|\u756a\u8304\u4e00\u4e2a/,
  /\u6d0b\u8471\u4e09\u4ef6\u5957|\u8364\u7d20\u642d\u914d|\u8d85\u5e02/,
  /\u62e9\u9ec4\u74dc|\u841d\u535c\u7b49|\u9999\u83dc\u4e00\u9897|\u9999\u83dc\u53f6|\u7389\u7c73\u7c92|\u841d\u535c\u5e72|\u4fc4\u5f0f\u9178\u9ec4\u74dc\u6c41|\u9e70\u5634\u8c46/,
  /\u53f6\u83dc\u7c7b\u852c\u83dc|\u83cc\u83c7|\u9ad8\u6c64\u6b27\u82b9|\u571f\u8c46\u5e72\u7c89\u6761/,
];

const BLOCKED_MEAT_EXACT_NAMES = [
  '鲣鱼海苔碎',
  '牛肉高汤',
  '蟹味菇',
  '肉片',
];

const BLOCKED_MEAT_PARTIAL_PATTERNS = [
  /高汤/,
  /海苔碎/,
];

const MEAT_CANONICAL_NAME_PAIRS = [
  ['草鱼农贸市场', '草鱼'],
  ['次选梭子蟹', '梭子蟹'],
  ['牛腩首选坑腩', '牛腩'],
  ['螃蟹首选河蟹', '河蟹'],
  ['虾仁个人口味', '虾仁'],
  ['黑虎虾明虾', '明虾'],
  ['肥牛火锅肥牛', '肥牛'],
  ['可用羊肉替代', '羊肉'],
  ['肉猪肉', '猪肉'],
  ['无骨肉猪肉', '猪肉'],
  ['去皮猪肉', '猪肉'],
  ['用猪里脊肉', '猪里脊'],
  ['鲜仔鸭肉', '鸭肉'],
  ['鱼头一个', '鱼头'],
  ['带皮五花肉', '五花肉'],
  ['带皮猪五花肉', '五花肉'],
  ['五花肉薄片', '五花肉'],
  ['五花肉条', '五花肉'],
  ['猪五花肉', '五花肉'],
  ['猪里脊肉', '猪里脊'],
  ['里脊肉', '猪里脊'],
  ['大鸡腿', '鸡腿'],
  ['碎牛肉', '牛肉末'],
];

const MEAT_CANONICAL_NAME_MAP = new Map(
  MEAT_CANONICAL_NAME_PAIRS.map(([from, to]) => [normalizeIngredientName(from), to]),
);

const BLOCKED_INGREDIENT_EXACT_NORMALIZED = new Set(
  BLOCKED_INGREDIENT_EXACT_NAMES.map((name) => normalizeIngredientName(name)),
);

const BLOCKED_MEAT_EXACT_NORMALIZED = new Set(
  BLOCKED_MEAT_EXACT_NAMES.map((name) => normalizeIngredientName(name)),
);

function getCanonicalIngredientName(name, category) {
  const trimmedName = String(name || '').trim();

  if (!trimmedName) {
    return '';
  }

  if (category !== 'meat') {
    return trimmedName;
  }

  const normalizedName = normalizeIngredientName(trimmedName);
  return MEAT_CANONICAL_NAME_MAP.get(normalizedName) || trimmedName;
}

function isBlockedIngredient(ingredient) {
  if (!ingredient || !ingredient.name) {
    return false;
  }

  const canonicalName = getCanonicalIngredientName(ingredient.name, ingredient.category);
  const normalizedName = normalizeIngredientName(canonicalName);

  if (BLOCKED_INGREDIENT_EXACT_NORMALIZED.has(normalizedName)) {
    return true;
  }

  if (ingredient.category === 'vegetable') {
    return BLOCKED_VEGETABLE_PARTIAL_PATTERNS.some((pattern) => pattern.test(canonicalName));
  }

  if (ingredient.category === 'meat') {
    if (BLOCKED_MEAT_EXACT_NORMALIZED.has(normalizedName)) {
      return true;
    }

    return BLOCKED_MEAT_PARTIAL_PATTERNS.some((pattern) => pattern.test(canonicalName));
  }

  return false;
}

function getVisibleIngredients() {
  const seen = new Set();

  return [...DEFAULT_INGREDIENTS, ...state.customIngredients]
    .map((ingredient) => ({
      ...ingredient,
      name: getCanonicalIngredientName(ingredient.name, ingredient.category),
    }))
    .filter((ingredient) => ingredient.name)
    .filter(
      (ingredient) => !isBlockedIngredient(ingredient) && !state.hiddenIngredientIds.has(ingredient.id) && !ingredient.isHidden,
    )
    .filter((ingredient) => {
      const dedupeKey = `${ingredient.category}:${normalizeIngredientName(ingredient.name)}`;

      if (seen.has(dedupeKey)) {
        return false;
      }

      seen.add(dedupeKey);
      return true;
    });
}

function getIngredientsByCategory(category) {
  return getVisibleIngredients().filter((ingredient) => ingredient.category === category);
}

function getFilteredIngredientsByCategory(category) {
  const query = normalizeSearchQuery(state.ingredientQuery);
  const ingredients = getIngredientsByCategory(category);

  if (!query) {
    return ingredients;
  }

  return ingredients.filter((ingredient) => normalizeSearchQuery(ingredient.name).includes(query));
}

function getHiddenDefaultCount(category) {
  return DEFAULT_INGREDIENTS.filter(
    (ingredient) => ingredient.category === category && state.hiddenIngredientIds.has(ingredient.id),
  ).length;
}

function dedupeStringList(values) {
  const result = [];
  const seen = new Set();

  for (const value of values || []) {
    const trimmed = String(value || '').trim();

    if (!trimmed) {
      continue;
    }

    const normalized = normalizeIngredientName(trimmed);
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

function normalizeRecipeIngredients(values, category) {
  const normalized = [];
  const seen = new Set();

  for (const value of values || []) {
    const canonical = getCanonicalIngredientName(value, category);

    if (!canonical) {
      continue;
    }

    const normalizedName = normalizeIngredientName(canonical);
    if (seen.has(normalizedName)) {
      continue;
    }

    if (isBlockedIngredient({ name: canonical, category })) {
      continue;
    }

    seen.add(normalizedName);
    normalized.push(canonical);
  }

  return normalized;
}

function mergeRecipesByName(recipes) {
  const merged = new Map();

  for (const recipe of recipes) {
    const recipeName = String(recipe?.name || '').trim();

    if (!recipeName) {
      continue;
    }

    const key = normalizeIngredientName(recipeName);

    if (!merged.has(key)) {
      merged.set(key, {
        ...recipe,
        vegetables: [...(recipe.vegetables || [])],
        meats: [...(recipe.meats || [])],
        otherIngredients: [...(recipe.otherIngredients || [])],
        seasonings: [...(recipe.seasonings || [])],
        steps: [...(recipe.steps || [])],
        tags: [...(recipe.tags || [])],
      });
      continue;
    }

    const current = merged.get(key);
    current.vegetables = dedupeStringList([...(current.vegetables || []), ...(recipe.vegetables || [])]);
    current.meats = dedupeStringList([...(current.meats || []), ...(recipe.meats || [])]);
    current.otherIngredients = dedupeStringList([
      ...(current.otherIngredients || []),
      ...(recipe.otherIngredients || []),
    ]);
    current.seasonings = dedupeStringList([...(current.seasonings || []), ...(recipe.seasonings || [])]);
    current.tags = dedupeStringList([...(current.tags || []), ...(recipe.tags || [])]);

    if ((recipe.steps || []).length > (current.steps || []).length) {
      current.steps = [...(recipe.steps || [])];
    }

    if (!current.summary && recipe.summary) {
      current.summary = recipe.summary;
    }
  }

  return [...merged.values()].filter((recipe) => (recipe.vegetables || []).length || (recipe.meats || []).length);
}

const NORMALIZED_RECIPES = mergeRecipesByName(
  RECIPES.map((recipe) => ({
    ...recipe,
    vegetables: normalizeRecipeIngredients(recipe.vegetables, 'vegetable'),
    meats: normalizeRecipeIngredients(recipe.meats, 'meat'),
    otherIngredients: dedupeStringList(recipe.otherIngredients || []),
    seasonings: dedupeStringList(recipe.seasonings || []),
    steps: dedupeStringList(recipe.steps || []),
    tags: dedupeStringList(recipe.tags || []),
  })),
);

function getRecipeMatches() {
  const selectedVegetables = [...state.selectedVegetables];
  const selectedMeats = [...state.selectedMeats];
  const vegetableMatches = filterRecipesByVegetables(selectedVegetables, NORMALIZED_RECIPES);
  const meatMatches = filterRecipesByMeats(selectedMeats, NORMALIZED_RECIPES);
  const visibleRecipes = getVisibleRecipes({ selectedVegetables, selectedMeats, recipes: NORMALIZED_RECIPES });

  return {
    visibleRecipes,
    vegetableMatchIds: new Set(vegetableMatches.map((recipe) => recipe.id)),
    meatMatchIds: new Set(meatMatches.map((recipe) => recipe.id)),
  };
}

function getActiveRecipe() {
  return NORMALIZED_RECIPES.find((recipe) => recipe.id === state.activeRecipeId) || null;
}

function saveIngredientState() {
  saveIngredientPreferences({
    customIngredients: state.customIngredients,
    hiddenIngredientIds: [...state.hiddenIngredientIds],
  });
}

function savePresetState() {
  savePresetRecipeIds([...state.presetRecipeIds]);
}

function ingredientExists(name, category) {
  const normalizedName = normalizeIngredientName(getCanonicalIngredientName(name, category));
  return [...DEFAULT_INGREDIENTS, ...state.customIngredients].some((ingredient) => {
    if (ingredient.category !== category) {
      return false;
    }

    const canonicalName = getCanonicalIngredientName(ingredient.name, ingredient.category);
    return normalizeIngredientName(canonicalName) === normalizedName;
  });
}

function toggleIngredient(category, ingredientName) {
  const targetSet = category === 'vegetable' ? state.selectedVegetables : state.selectedMeats;

  if (targetSet.has(ingredientName)) {
    targetSet.delete(ingredientName);
  } else {
    targetSet.add(ingredientName);
  }

  render({ preserveScroll: true });
}

function clearSelections() {
  state.selectedVegetables.clear();
  state.selectedMeats.clear();
  render({ preserveScroll: true });
}

function openModal(category) {
  state.modal = {
    isOpen: true,
    category,
    error: '',
    draft: {
      name: '',
      icon: '',
      note: '',
    },
  };
  render();
}

function closeModal() {
  state.modal = {
    ...state.modal,
    isOpen: false,
    error: '',
  };
  render();
}

function addIngredient(form) {
  const formData = new FormData(form);
  const category = formData.get('category')?.toString() || state.modal.category;
  const name = formData.get('name')?.toString().trim() || '';
  const icon = formData.get('icon')?.toString().trim() || '';
  const note = formData.get('note')?.toString().trim() || '';

  state.modal = {
    ...state.modal,
    draft: { name, icon, note },
    error: '',
  };

  if (!name) {
    state.modal.error = '\u98df\u6750\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u3002';
    render();
    return;
  }

  if (isBlockedIngredient({ name, category })) {
    state.modal.error = '\u8be5\u98df\u6750\u5df2\u88ab\u5c4f\u853d\uff0c\u8bf7\u6362\u4e00\u4e2a\u540d\u79f0\u3002';
    render();
    return;
  }

  if (ingredientExists(name, category)) {
    state.modal.error = '\u540c\u4e00\u5206\u7c7b\u4e0b\u5df2\u5b58\u5728\u540c\u540d\u98df\u6750\uff0c\u8bf7\u6362\u4e00\u4e2a\u540d\u79f0\u3002';
    render();
    return;
  }

  const prefix = category === 'vegetable' ? 'veg' : 'meat';
  const idSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  state.customIngredients = [
    ...state.customIngredients,
    {
      id: `${prefix}_custom_${idSuffix}`,
      name,
      category,
      icon,
      note,
      isDefault: false,
      isHidden: false,
    },
  ];

  saveIngredientState();
  closeModal();
}

function deleteIngredient(ingredientId) {
  const ingredient = [...DEFAULT_INGREDIENTS, ...state.customIngredients].find((item) => item.id === ingredientId);

  if (!ingredient) {
    return;
  }

  const confirmed = window.confirm(`确定删除“${ingredient.name}”吗？`);
  if (!confirmed) {
    return;
  }

  const canonicalName = getCanonicalIngredientName(ingredient.name, ingredient.category);

  if (ingredient.category === 'vegetable') {
    state.selectedVegetables.delete(canonicalName);
  } else {
    state.selectedMeats.delete(canonicalName);
  }

  if (ingredient.isDefault) {
    state.hiddenIngredientIds.add(ingredient.id);
  } else {
    state.customIngredients = state.customIngredients.filter((item) => item.id !== ingredient.id);
  }

  saveIngredientState();
  render();
}

function restoreDefaults(category) {
  DEFAULT_INGREDIENTS.filter((ingredient) => ingredient.category === category).forEach((ingredient) => {
    state.hiddenIngredientIds.delete(ingredient.id);
  });

  saveIngredientState();
  render();
}

function togglePreset(recipeId) {
  if (state.presetRecipeIds.has(recipeId)) {
    state.presetRecipeIds.delete(recipeId);
  } else {
    state.presetRecipeIds.add(recipeId);
  }

  savePresetState();
  render();
}

function clearPresets() {
  state.presetRecipeIds.clear();
  savePresetState();
  render();
}

function openRecipe(recipeId) {
  state.activeRecipeId = recipeId;
  render();
}

function closeRecipe() {
  state.activeRecipeId = null;
  render();
}

function renderIngredientSection(category) {
  const ingredients = getFilteredIngredientsByCategory(category);
  const selectedSet = category === 'vegetable' ? state.selectedVegetables : state.selectedMeats;
  const hiddenDefaultCount = getHiddenDefaultCount(category);
  const ingredientQuery = normalizeSearchQuery(state.ingredientQuery);
  const searchHint = ingredientQuery
    ? `没有匹配“${escapeHtml(state.ingredientQuery.trim())}”的${CATEGORY_LABELS[category]}。`
    : '';
  const emptyHint = category === 'vegetable' ? '\u8fd8\u6ca1\u6709\u852c\u83dc\uff0c\u5148\u52a0\u4e00\u4e2a\u5e38\u7528\u98df\u6750\u5427\u3002' : '\u8fd8\u6ca1\u6709\u8089\u7c7b\uff0c\u5148\u8865\u51e0\u4e2a\u5e38\u505a\u4e3b\u83dc\u7684\u98df\u6750\u5427\u3002';

  return `
    <section class="ingredient-section ingredient-section--${category}">
      <div class="section-head">
        <div>
          <p class="section-kicker">${category === 'vegetable' ? 'Left Door - Upper Shelf' : 'Left Door - Lower Shelf'}</p>
          <h2>${CATEGORY_LABELS[category]}</h2>
        </div>
        <div class="section-actions">
          <button class="ghost-button" data-action="open-modal" data-category="${category}">\u6dfb\u52a0</button>
          ${
            hiddenDefaultCount > 0
              ? `<button class="ghost-button" data-action="restore-defaults" data-category="${category}">\u6062\u590d\u9ed8\u8ba4 ${hiddenDefaultCount}</button>`
              : ''
          }
        </div>
      </div>
      <div class="ingredient-section__body">
        <p class="section-rule">
          ${
            category === 'vegetable'
              ? '\u89c4\u5219\uff1a\u83dc\u8c31\u4e2d\u7684\u852c\u83dc\u5fc5\u987b\u5168\u90e8\u5c5e\u4e8e\u5df2\u9009\u96c6\u5408\uff0c\u4e14\u4e0d\u80fd\u5305\u542b\u8089\u7c7b\u3002'
              : '\u89c4\u5219\uff1a\u53ea\u8981\u83dc\u8c31\u5305\u542b\u5df2\u9009\u8089\u7c7b\uff0c\u5c31\u76f4\u63a5\u51fa\u73b0\u3002'
          }
        </p>
        <div class="ingredient-grid">
          ${
            ingredients.length
              ? ingredients
                  .map((ingredient) => {
                    const isSelected = selectedSet.has(ingredient.name);
                    const safeName = escapeHtml(ingredient.name);
                    const safeNote = escapeHtml(ingredient.note || (ingredient.isDefault ? '\u9ed8\u8ba4\u98df\u6750' : '\u81ea\u5b9a\u4e49\u98df\u6750'));
                    const safeIcon = escapeHtml(ingredient.icon || ingredient.name.slice(0, 1));

                    return `
                      <article class="ingredient-card ${isSelected ? 'is-selected' : ''}">
                        <button
                          class="ingredient-card__main"
                          data-action="toggle-ingredient"
                          data-category="${category}"
                          data-name="${safeName}"
                          aria-pressed="${isSelected ? 'true' : 'false'}"
                        >
                          <span class="ingredient-badge">${safeIcon}</span>
                          <span class="ingredient-copy">
                            <strong>${safeName}</strong>
                            <small>${safeNote}</small>
                          </span>
                        </button>
                        ${isSelected ? '<span class="ingredient-selected-tag">\u5df2\u9009</span>' : ''}
                        <button
                          class="delete-button"
                          data-action="delete-ingredient"
                          data-id="${ingredient.id}"
                          aria-label="\u5220\u9664 ${safeName}"
                        >
                          \u00d7
                        </button>
                      </article>
                    `;
                  })
                  .join('')
              : `<p class="empty-state empty-state--compact">${searchHint || emptyHint}</p>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderFridgePreviewDoor(meta = {}) {
  const activeSelectionCount = meta.activeSelectionCount || 0;
  const matchedRecipes = Array.isArray(meta.matchedRecipes) ? meta.matchedRecipes : [];
  const recipeQuery = normalizeSearchQuery(state.recipeQuery);
  const hasRecipeQuery = Boolean(recipeQuery);
  const recipePool = activeSelectionCount === 0 && hasRecipeQuery ? NORMALIZED_RECIPES : matchedRecipes;
  const visibleNotes = hasRecipeQuery
    ? recipePool.filter((recipe) => recipeNameMatchesQuery(recipe, recipeQuery))
    : recipePool;
  const safeRecipeQuery = escapeHtml(state.recipeQuery.trim());

  let summaryText = '\u53f3\u95e8\u521d\u59cb\u4e3a\u7a7a\uff0c\u8bf7\u5148\u4ece\u5de6\u95e8\u9009\u62e9\u98df\u6750\u3002';
  if (activeSelectionCount > 0 && hasRecipeQuery) {
    summaryText = `已选 ${activeSelectionCount} 项，菜名搜索“${safeRecipeQuery}”后命中 ${visibleNotes.length} 张便签。`;
  } else if (activeSelectionCount > 0) {
    summaryText = `\u5df2\u9009\u62e9 ${activeSelectionCount} \u9879\uff0c\u53f3\u95e8\u663e\u793a ${visibleNotes.length} \u5f20\u5bf9\u5e94\u83dc\u8c31\u4fbf\u7b7e\u3002`;
  } else if (hasRecipeQuery) {
    summaryText = `菜名搜索“${safeRecipeQuery}”命中 ${visibleNotes.length} 张便签。`;
  }

  const emptyTitle = hasRecipeQuery
    ? '未找到匹配菜名'
    : activeSelectionCount
      ? "\u6682\u65e0\u5339\u914d\u83dc\u8c31"
      : "\u5148\u9009\u62e9\u5de6\u95e8\u98df\u6750";
  const emptyDesc = hasRecipeQuery
    ? '试试更短关键词，例如：牛腩、鸡翅、西兰花。'
    : activeSelectionCount
      ? '\u8bd5\u8bd5\u51cf\u5c11\u852c\u83dc\u9009\u9879\uff0c\u6216\u589e\u52a0\u4e00\u79cd\u8089\u7c7b\u6765\u6269\u5c55\u7ed3\u679c\u3002'
      : '\u53f3\u95e8\u4f1a\u5728\u4f60\u9009\u4e2d\u852c\u83dc\u6216\u8089\u7c7b\u540e\uff0c\u51fa\u73b0\u5bf9\u5e94\u83dc\u8c31\u4fbf\u7b7e\u3002';

  return `
    <section class="fridge-preview">
      <div class="fridge-preview__head">
        <p class="section-kicker">Right Door - Recipe Notes</p>
        <h2>\u5168\u90e8\u83dc\u8c31\u9884\u89c8</h2>
        <p class="section-rule">${summaryText}</p>
        <label class="search-field search-field--recipe">
          <span>搜索菜名</span>
          <input
            type="search"
            value="${escapeHtml(state.recipeQuery)}"
            placeholder="例如：可乐鸡翅"
            data-action="search-recipes"
            autocomplete="off"
          />
        </label>
      </div>
      <div class="fridge-preview__list">
        ${
          visibleNotes.length
            ? visibleNotes
                .map((recipe) => {
                  const isPreset = state.presetRecipeIds.has(recipe.id);
                  return `
                    <article class="recipe-note">
                      <button class="recipe-note__main" data-action="open-recipe" data-id="${recipe.id}">
                        <strong>${recipe.name}</strong>
                        <small>${recipe.cookTime} \u5206\u949f</small>
                        <small>${recipe.difficulty}</small>
                      </button>
                      <button class="recipe-note__action" data-action="toggle-preset" data-id="${recipe.id}" aria-label="preset ${recipe.name}">
                        ${isPreset ? '\u2605' : '\u2606'}
                      </button>
                    </article>
                  `;
                })
                .join('')
            : `<div class="fridge-preview-empty"><h3>${emptyTitle}</h3><p>${emptyDesc}</p></div>`
        }
      </div>
    </section>
  `;
}
function renderRecipeCard(recipe, matchMeta) {
  const isPreset = state.presetRecipeIds.has(recipe.id);
  const ingredientSummary = [
    recipe.vegetables.length ? `蔬菜：${recipe.vegetables.join('、')}` : '',
    recipe.meats.length ? `肉类：${recipe.meats.join('、')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const matchBadges = [
    matchMeta.matchesVegetable ? '<span class="match-pill match-pill--veg">蔬菜严格命中</span>' : '',
    matchMeta.matchesMeat ? '<span class="match-pill match-pill--meat">肉类命中</span>' : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <article class="recipe-card">
      <div class="recipe-card__head">
        <div>
          <p class="recipe-category">${recipe.category}</p>
          <h3>${recipe.name}</h3>
        </div>
        <button class="recipe-open" data-action="open-recipe" data-id="${recipe.id}">查看详情</button>
      </div>
      <p class="recipe-summary">${recipe.summary}</p>
      <p class="recipe-ingredients">${ingredientSummary || '主打肉菜，无需额外蔬菜前置。'}</p>
      <div class="recipe-meta">
        <span>${recipe.cookTime} 分钟</span>
        <span>${recipe.difficulty}</span>
        <span>${recipe.tags.join(' / ')}</span>
      </div>
      <div class="recipe-match-row">${matchBadges || '<span class="match-pill match-pill--all">默认浏览</span>'}</div>
      <div class="recipe-card__footer">
        <button class="primary-button" data-action="toggle-preset" data-id="${recipe.id}">
          ${isPreset ? '移出预选' : '加入预选'}
        </button>
      </div>
    </article>
  `;
}

function renderRecipeDrawer() {
  const recipe = getActiveRecipe();

  if (!recipe) {
    return '';
  }

  const isPreset = state.presetRecipeIds.has(recipe.id);

  return `
    <div class="overlay" data-action="close-recipe"></div>
    <aside class="drawer" aria-label="${recipe.name} 详情">
      <button class="drawer-close" data-action="close-recipe" aria-label="关闭详情">×</button>
      <p class="drawer-kicker">${recipe.category}</p>
      <h2>${recipe.name}</h2>
      <p class="drawer-summary">${recipe.summary}</p>
      <div class="drawer-top-meta">
        <span>${recipe.cookTime} 分钟</span>
        <span>${recipe.difficulty}</span>
        <span>${recipe.tags.join(' / ')}</span>
      </div>
      <div class="drawer-block">
        <h3>食材组成</h3>
        <ul>
          <li><strong>蔬菜：</strong>${recipe.vegetables.length ? recipe.vegetables.join('、') : '无'}</li>
          <li><strong>肉类：</strong>${recipe.meats.length ? recipe.meats.join('、') : '无'}</li>
          <li><strong>其他辅料：</strong>${recipe.otherIngredients.length ? recipe.otherIngredients.join('、') : '无'}</li>
          <li><strong>调味料：</strong>${recipe.seasonings.join('、')}</li>
        </ul>
      </div>
      <div class="drawer-block">
        <h3>做法步骤</h3>
        <ol>
          ${recipe.steps.map((step) => `<li>${step}</li>`).join('')}
        </ol>
      </div>
      <button class="primary-button primary-button--full" data-action="toggle-preset" data-id="${recipe.id}">
        ${isPreset ? '从预选区移除' : '加入预选菜谱'}
      </button>
    </aside>
  `;
}

function renderModal() {
  if (!state.modal.isOpen) {
    return '';
  }

  const { category, draft, error } = state.modal;

  return `
    <div class="overlay" data-action="close-modal"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-label="新增食材">
      <div class="modal-head">
        <div>
          <p class="drawer-kicker">Ingredient Manager</p>
          <h2>新增${CATEGORY_LABELS[category]}</h2>
        </div>
        <button class="drawer-close" data-action="close-modal" aria-label="关闭新增食材">×</button>
      </div>
      <form id="ingredient-form" class="modal-form">
        <input type="hidden" name="category" value="${category}" />
        <label>
          食材名称
          <input id="ingredient-name" name="name" value="${escapeHtml(draft.name)}" maxlength="20" placeholder="例如：生菜" />
        </label>
        <label>
          图标文字（可选）
          <input name="icon" value="${escapeHtml(draft.icon)}" maxlength="2" placeholder="例如：生" />
        </label>
        <label>
          备注（可选）
          <textarea name="note" rows="3" maxlength="30" placeholder="例如：适合凉拌、做沙拉">${escapeHtml(draft.note)}</textarea>
        </label>
        ${error ? `<p class="form-error">${error}</p>` : ''}
        <div class="modal-actions">
          <button type="button" class="ghost-button" data-action="close-modal">取消</button>
          <button type="submit" class="primary-button">立即添加</button>
        </div>
      </form>
    </div>
  `;
}

function renderPresetBar() {
  const presetRecipes = NORMALIZED_RECIPES.filter((recipe) => state.presetRecipeIds.has(recipe.id));

  return `
    <section class="preset-bar">
      <div class="preset-bar__head">
        <div>
          <p class="section-kicker">Preset Tray</p>
          <h2>预选菜谱</h2>
        </div>
        <div class="preset-meta">
          <span>${presetRecipes.length} 道已预选</span>
          ${
            presetRecipes.length
              ? '<button class="ghost-button" data-action="clear-presets">清空预选</button>'
              : '<span class="preset-empty-hint">加入后会自动本地保存</span>'
          }
        </div>
      </div>
      <div class="preset-list">
        ${
          presetRecipes.length
            ? presetRecipes
                .map(
                  (recipe) => `
                    <article class="preset-chip">
                      <button class="preset-chip__main" data-action="open-recipe" data-id="${recipe.id}">
                        <strong>${recipe.name}</strong>
                        <small>${recipe.cookTime} 分钟 · ${recipe.difficulty}</small>
                      </button>
                      <button class="delete-button" data-action="toggle-preset" data-id="${recipe.id}" aria-label="移除 ${recipe.name}">
                        ×
                      </button>
                    </article>
                  `,
                )
                .join('')
            : '<p class="empty-state">\u8fd8\u6ca1\u6709\u9884\u9009\u83dc\u8c31\uff0c\u5148\u4ece\u51b0\u7bb1\u53f3\u95e8\u91cc\u6311\u4e00\u4e24\u9053\u60f3\u505a\u7684\u5427\u3002</p>'
        }
      </div>
    </section>
  `;
}

function render(options = {}) {
  const preserveScroll = Boolean(options.preserveScroll);
  const focusSelector = typeof options.focusSelector === 'string' ? options.focusSelector : '';
  const cursorPosition = Number.isInteger(options.cursorPosition) ? options.cursorPosition : null;
  const previousScrollY = preserveScroll ? window.scrollY : null;
  const previousIngredientPanelScroll = preserveScroll
    ? {
        vegetable:
          document.querySelector('.ingredient-section--vegetable .ingredient-section__body')?.scrollTop || 0,
        meat:
          document.querySelector('.ingredient-section--meat .ingredient-section__body')?.scrollTop || 0,
      }
    : null;
  const previousPreviewDoorScroll = preserveScroll
    ? document.querySelector('.fridge-preview__list')?.scrollTop || 0
    : 0;
  const { visibleRecipes } = getRecipeMatches();
  const activeSelectionCount = state.selectedVegetables.size + state.selectedMeats.size;

  app.innerHTML = `
    <div class="page-shell">
      <header class="hero">
        <div>
          <p class="hero-kicker">Manji Fridge Recipe</p>
          <h1>满记冰箱</h1>
          <p class="hero-copy">
            \u53cc\u5f00\u95e8\u5e03\u5c40\uff1a\u5de6\u95e8\u4e0a\u5c42\u852c\u83dc\u3001\u4e0b\u5c42\u8089\u7c7b\uff1b\u53f3\u95e8\u662f\u83dc\u8c31\u4fbf\u7b7e\u9884\u89c8\u533a\u3002\u521d\u59cb\u9ed8\u8ba4\u4e3a\u7a7a\uff0c\u9009\u4e2d\u5de6\u95e8\u98df\u6750\u540e\u663e\u793a\u5bf9\u5e94\u83dc\u8c31\u3002
          </p>
        </div>
        <div class="hero-stats">
          <article>
            <strong>${getVisibleIngredients().length}</strong>
            <span>当前食材</span>
          </article>
          <article>
            <strong>${visibleRecipes.length}</strong>
            <span>\u5f53\u524d\u547d\u4e2d</span>
          </article>
          <article>
            <strong>${state.presetRecipeIds.size}</strong>
            <span>预选中</span>
          </article>
        </div>
      </header>

      <main class="workspace">
        <section class="fridge-panel">
          <div class="fridge-panel__head">
            <p class="fridge-panel__hint">\u5de6\u95e8\uff1a\u4e0a\u5c42\u852c\u83dc\uff0c\u4e0b\u5c42\u8089\u7c7b\u3002\u53f3\u95e8\uff1a\u83dc\u8c31\u4fbf\u7b7e\u9884\u89c8\uff08\u521d\u59cb\u4e3a\u7a7a\uff0c\u9009\u98df\u6750\u540e\u663e\u793a\uff09\u3002</p>
            <div class="fridge-panel__controls">
              <button class="ghost-button" data-action="clear-selections">\u6e05\u7a7a\u5df2\u9009\u98df\u6750</button>
              <label class="search-field search-field--ingredient">
                <span>搜索食材</span>
                <input
                  type="search"
                  value="${escapeHtml(state.ingredientQuery)}"
                  placeholder="例如：牛腩 / 西兰花"
                  data-action="search-ingredients"
                  autocomplete="off"
                />
              </label>
            </div>
          </div>
          <div class="fridge-shell">
            <div class="fridge-shell__glow"></div>
            <div class="fridge-stickers" aria-hidden="true">
              <span class="fridge-sticker fridge-sticker--fresh">Fresh</span>
              <span class="fridge-sticker fridge-sticker--chef">Chef</span>
              <span class="fridge-sticker fridge-sticker--yum">Yum</span>
            </div>
            <div class="fridge-handle fridge-handle--left"></div>
            <div class="fridge-handle fridge-handle--right"></div>
            <div class="fridge-door fridge-door--left">
              ${renderIngredientSection('vegetable')}
              ${renderIngredientSection('meat')}
            </div>
            <div class="fridge-door fridge-door--right">
              ${renderFridgePreviewDoor({ activeSelectionCount, matchedRecipes: visibleRecipes })}
            </div>
          </div>
        </section>
      </main>

      ${renderPresetBar()}
      ${renderRecipeDrawer()}
      ${renderModal()}
    </div>
  `;

  if (preserveScroll && previousScrollY !== null) {
    window.scrollTo({ top: previousScrollY, left: 0, behavior: 'auto' });
  }

  if (preserveScroll && previousIngredientPanelScroll) {
    const vegetableBody = document.querySelector('.ingredient-section--vegetable .ingredient-section__body');
    const meatBody = document.querySelector('.ingredient-section--meat .ingredient-section__body');
    const previewList = document.querySelector('.fridge-preview__list');

    if (vegetableBody) {
      vegetableBody.scrollTop = previousIngredientPanelScroll.vegetable;
    }

    if (meatBody) {
      meatBody.scrollTop = previousIngredientPanelScroll.meat;
    }

    if (previewList) {
      previewList.scrollTop = previousPreviewDoorScroll;
    }
  }

  if (focusSelector) {
    const focusTarget = document.querySelector(focusSelector);

    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });

      if (
        cursorPosition !== null &&
        typeof focusTarget.setSelectionRange === 'function' &&
        typeof focusTarget.value === 'string'
      ) {
        const maxPosition = focusTarget.value.length;
        const safePosition = Math.max(0, Math.min(cursorPosition, maxPosition));
        focusTarget.setSelectionRange(safePosition, safePosition);
      }
    }
  }

  if (state.modal.isOpen) {
    window.requestAnimationFrame(() => {
      const input = document.querySelector('#ingredient-name');
      if (input) {
        input.focus();
      }
    });
  }
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === 'toggle-ingredient') {
    toggleIngredient(target.dataset.category, target.dataset.name);
    return;
  }

  if (action === 'open-modal') {
    openModal(target.dataset.category);
    return;
  }

  if (action === 'close-modal') {
    closeModal();
    return;
  }

  if (action === 'delete-ingredient') {
    deleteIngredient(target.dataset.id);
    return;
  }

  if (action === 'restore-defaults') {
    restoreDefaults(target.dataset.category);
    return;
  }

  if (action === 'clear-selections') {
    clearSelections();
    return;
  }

  if (action === 'toggle-preset') {
    togglePreset(target.dataset.id);
    return;
  }

  if (action === 'clear-presets') {
    clearPresets();
    return;
  }

  if (action === 'open-recipe') {
    openRecipe(target.dataset.id);
    return;
  }

  if (action === 'close-recipe') {
    closeRecipe();
  }
});

app.addEventListener('submit', (event) => {
  if (event.target.id !== 'ingredient-form') {
    return;
  }

  event.preventDefault();
  addIngredient(event.target);
});

app.addEventListener('input', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const action = target.dataset.action;
  const isSearchInput = action === 'search-ingredients' || action === 'search-recipes';
  const isComposing = event.isComposing || target.dataset.isComposing === 'true';

  if (!isSearchInput) {
    return;
  }

  if (action === 'search-ingredients') {
    state.ingredientQuery = target.value || '';
  } else {
    state.recipeQuery = target.value || '';
  }

  if (isComposing) {
    return;
  }

  if (action === 'search-ingredients') {
    render({
      preserveScroll: true,
      focusSelector: '[data-action="search-ingredients"]',
      cursorPosition: target.selectionStart ?? state.ingredientQuery.length,
    });
    return;
  }

  render({
    preserveScroll: true,
    focusSelector: '[data-action="search-recipes"]',
    cursorPosition: target.selectionStart ?? state.recipeQuery.length,
  });
});

app.addEventListener('compositionstart', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  if (target.dataset.action !== 'search-ingredients' && target.dataset.action !== 'search-recipes') {
    return;
  }

  target.dataset.isComposing = 'true';
});

app.addEventListener('compositionend', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action !== 'search-ingredients' && action !== 'search-recipes') {
    return;
  }

  target.dataset.isComposing = 'false';

  if (action === 'search-ingredients') {
    state.ingredientQuery = target.value || '';
    render({
      preserveScroll: true,
      focusSelector: '[data-action="search-ingredients"]',
      cursorPosition: state.ingredientQuery.length,
    });
    return;
  }

  state.recipeQuery = target.value || '';
  render({
    preserveScroll: true,
    focusSelector: '[data-action="search-recipes"]',
    cursorPosition: state.recipeQuery.length,
  });
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (state.modal.isOpen) {
    closeModal();
    return;
  }

  if (state.activeRecipeId) {
    closeRecipe();
  }
});

render();










