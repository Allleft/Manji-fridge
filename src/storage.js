const INGREDIENTS_KEY = 'manji-fridge.ingredients.v1';
const PRESETS_KEY = 'manji-fridge.presets.v1';

function readStorage(key, fallback) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadIngredientPreferences() {
  const fallback = { customIngredients: [], hiddenIngredientIds: [] };
  const value = readStorage(INGREDIENTS_KEY, fallback);

  return {
    customIngredients: Array.isArray(value.customIngredients) ? value.customIngredients : [],
    hiddenIngredientIds: Array.isArray(value.hiddenIngredientIds) ? value.hiddenIngredientIds : [],
  };
}

export function saveIngredientPreferences(preferences) {
  writeStorage(INGREDIENTS_KEY, preferences);
}

export function loadPresetRecipeIds() {
  const presetRecipeIds = readStorage(PRESETS_KEY, []);
  return Array.isArray(presetRecipeIds) ? presetRecipeIds : [];
}

export function savePresetRecipeIds(recipeIds) {
  writeStorage(PRESETS_KEY, recipeIds);
}
