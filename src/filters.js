export function filterRecipesByVegetables(selectedVegetables, recipes) {
  const vegetableSet = new Set(selectedVegetables.filter(Boolean));

  if (vegetableSet.size === 0) {
    return [];
  }

  return recipes.filter((recipe) => {
    const recipeVegetables = Array.isArray(recipe.vegetables) ? recipe.vegetables : [];
    const recipeMeats = Array.isArray(recipe.meats) ? recipe.meats : [];

    if (recipeVegetables.length === 0) {
      return false;
    }

    const hasSelectedVegetable = recipeVegetables.some((vegetable) => vegetableSet.has(vegetable));
    const onlyUsesSelectedVegetables = recipeVegetables.every((vegetable) => vegetableSet.has(vegetable));
    const hasNoMeat = recipeMeats.length === 0;

    return hasSelectedVegetable && onlyUsesSelectedVegetables && hasNoMeat;
  });
}

export function filterRecipesByMeats(selectedMeats, recipes) {
  const meatSet = new Set(selectedMeats.filter(Boolean));

  if (meatSet.size === 0) {
    return [];
  }

  return recipes.filter((recipe) => {
    const recipeMeats = Array.isArray(recipe.meats) ? recipe.meats : [];
    return recipeMeats.some((meat) => meatSet.has(meat));
  });
}

export function mergeRecipeResults(...recipeGroups) {
  const recipeMap = new Map();

  recipeGroups.flat().forEach((recipe) => {
    if (recipe && !recipeMap.has(recipe.id)) {
      recipeMap.set(recipe.id, recipe);
    }
  });

  return Array.from(recipeMap.values());
}

export function getVisibleRecipes({ selectedVegetables, selectedMeats, recipes }) {
  const vegetableResults = filterRecipesByVegetables(selectedVegetables, recipes);
  const meatResults = filterRecipesByMeats(selectedMeats, recipes);

  if (selectedVegetables.length === 0 && selectedMeats.length === 0) {
    return [];
  }

  return mergeRecipeResults(vegetableResults, meatResults);
}

