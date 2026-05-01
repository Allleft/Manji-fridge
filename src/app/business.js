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

export function createBusinessContext({
  defaultIngredients,
  recipes,
  state,
  filterRecipesByVegetables,
  filterRecipesByMeats,
  getVisibleRecipes,
}) {
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

    return [...defaultIngredients, ...state.customIngredients]
      .map((ingredient) => ({
        ...ingredient,
        name: getCanonicalIngredientName(ingredient.name, ingredient.category),
      }))
      .filter((ingredient) => ingredient.name)
      .filter(
        (ingredient) =>
          !isBlockedIngredient(ingredient) &&
          !state.hiddenIngredientIds.has(ingredient.id) &&
          !ingredient.isHidden,
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
    return defaultIngredients.filter(
      (ingredient) => ingredient.category === category && state.hiddenIngredientIds.has(ingredient.id),
    ).length;
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

  function mergeRecipesByName(recipeList) {
    const merged = new Map();

    for (const recipe of recipeList) {
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

    return [...merged.values()].filter(
      (recipe) => (recipe.vegetables || []).length || (recipe.meats || []).length,
    );
  }

  const normalizedRecipes = mergeRecipesByName(
    recipes.map((recipe) => ({
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
    const vegetableMatches = filterRecipesByVegetables(selectedVegetables, normalizedRecipes);
    const meatMatches = filterRecipesByMeats(selectedMeats, normalizedRecipes);
    const visibleRecipes = getVisibleRecipes({
      selectedVegetables,
      selectedMeats,
      recipes: normalizedRecipes,
    });

    return {
      visibleRecipes,
      vegetableMatchIds: new Set(vegetableMatches.map((recipe) => recipe.id)),
      meatMatchIds: new Set(meatMatches.map((recipe) => recipe.id)),
    };
  }

  function getActiveRecipe() {
    return normalizedRecipes.find((recipe) => recipe.id === state.activeRecipeId) || null;
  }

  function getPresetRecipes() {
    return normalizedRecipes.filter((recipe) => state.presetRecipeIds.has(recipe.id));
  }

  function ingredientExists(name, category) {
    const normalizedName = normalizeIngredientName(getCanonicalIngredientName(name, category));

    return [...defaultIngredients, ...state.customIngredients].some((ingredient) => {
      if (ingredient.category !== category) {
        return false;
      }

      const canonicalName = getCanonicalIngredientName(ingredient.name, ingredient.category);
      return normalizeIngredientName(canonicalName) === normalizedName;
    });
  }

  return {
    escapeHtml,
    normalizeIngredientName,
    normalizeSearchQuery,
    recipeNameMatchesQuery,
    dedupeStringList,
    getCanonicalIngredientName,
    isBlockedIngredient,
    getVisibleIngredients,
    getIngredientsByCategory,
    getFilteredIngredientsByCategory,
    getHiddenDefaultCount,
    getRecipeMatches,
    getActiveRecipe,
    getPresetRecipes,
    ingredientExists,
    normalizedRecipes,
  };
}