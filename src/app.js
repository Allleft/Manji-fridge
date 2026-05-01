import { CATEGORY_LABELS, DEFAULT_INGREDIENTS, RECIPES } from './data.js';
import { filterRecipesByMeats, filterRecipesByVegetables, getVisibleRecipes } from './filters.js';
import { createActions } from './app/actions.js';
import { createBusinessContext } from './app/business.js';
import { registerAppEvents } from './app/events.js';
import { createRenderer } from './app/render.js';
import { createInitialState, persistIngredientState, persistPresetState } from './app/state.js';

const appElement = document.querySelector('#app');

const state = createInitialState();

const business = createBusinessContext({
  defaultIngredients: DEFAULT_INGREDIENTS,
  recipes: RECIPES,
  state,
  filterRecipesByVegetables,
  filterRecipesByMeats,
  getVisibleRecipes,
});

const renderer = createRenderer({
  appElement,
  state,
  business,
  categoryLabels: CATEGORY_LABELS,
});

const actions = createActions({
  state,
  renderer,
  business,
  defaultIngredients: DEFAULT_INGREDIENTS,
  persistIngredientState,
  persistPresetState,
});

registerAppEvents({
  appElement,
  actions,
});

renderer.render();