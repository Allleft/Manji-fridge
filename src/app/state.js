import {
  loadIngredientPreferences,
  loadPresetRecipeIds,
  saveIngredientPreferences,
  savePresetRecipeIds,
} from '../storage.js';

export function createInitialState() {
  const initialPreferences = loadIngredientPreferences();

  return {
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
}

export function persistIngredientState(state) {
  saveIngredientPreferences({
    customIngredients: state.customIngredients,
    hiddenIngredientIds: [...state.hiddenIngredientIds],
  });
}

export function persistPresetState(state) {
  savePresetRecipeIds([...state.presetRecipeIds]);
}