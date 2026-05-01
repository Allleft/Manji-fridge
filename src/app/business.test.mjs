import assert from 'node:assert/strict';

import { filterRecipesByMeats, filterRecipesByVegetables, getVisibleRecipes } from '../filters.js';
import { createBusinessContext } from './business.js';

function createState() {
  return {
    customIngredients: [],
    hiddenIngredientIds: new Set(),
    selectedVegetables: new Set(),
    selectedMeats: new Set(),
    ingredientQuery: '',
    recipeQuery: '',
    presetRecipeIds: new Set(),
    activeRecipeId: null,
    modal: {
      isOpen: false,
      category: 'vegetable',
      error: '',
      draft: { name: '', icon: '', note: '' },
    },
  };
}

const defaultIngredients = [
  { id: 'm1', name: '牛腩', category: 'meat', isDefault: true, isHidden: false },
  { id: 'm2', name: '牛腩首选坑腩', category: 'meat', isDefault: true, isHidden: false },
  { id: 'm3', name: '牛肉高汤', category: 'meat', isDefault: true, isHidden: false },
  { id: 'v1', name: '番茄', category: 'vegetable', isDefault: true, isHidden: false },
  { id: 'v2', name: '黄瓜', category: 'vegetable', isDefault: true, isHidden: false },
];

const recipes = [
  {
    id: 'r1',
    name: '牛腩煲',
    category: '测试',
    summary: '',
    vegetables: [],
    meats: ['牛腩首选坑腩'],
    otherIngredients: [],
    seasonings: [],
    steps: ['step1'],
    cookTime: 10,
    difficulty: '简单',
    tags: [],
  },
  {
    id: 'r2',
    name: '牛腩煲',
    category: '测试',
    summary: '',
    vegetables: [],
    meats: ['牛腩'],
    otherIngredients: [],
    seasonings: [],
    steps: ['step1', 'step2'],
    cookTime: 12,
    difficulty: '简单',
    tags: [],
  },
  {
    id: 'r3',
    name: '番茄小菜',
    category: '测试',
    summary: '',
    vegetables: ['番茄'],
    meats: [],
    otherIngredients: [],
    seasonings: [],
    steps: ['step'],
    cookTime: 5,
    difficulty: '简单',
    tags: [],
  },
  {
    id: 'r4',
    name: '番茄黄瓜',
    category: '测试',
    summary: '',
    vegetables: ['番茄', '黄瓜'],
    meats: [],
    otherIngredients: [],
    seasonings: [],
    steps: ['step'],
    cookTime: 5,
    difficulty: '简单',
    tags: [],
  },
];

const state = createState();
const business = createBusinessContext({
  defaultIngredients,
  recipes,
  state,
  filterRecipesByVegetables,
  filterRecipesByMeats,
  getVisibleRecipes,
});

const meatNames = business
  .getVisibleIngredients()
  .filter((item) => item.category === 'meat')
  .map((item) => item.name)
  .sort();

assert.deepEqual(meatNames, ['牛腩'], '肉类别名应归一化并去重，屏蔽词不应出现');
assert.equal(business.ingredientExists('牛腩首选坑腩', 'meat'), true, '同义肉类应判定为已存在');
assert.equal(business.normalizedRecipes.length, 3, '同名菜谱应被合并');

state.selectedMeats.add('牛腩');
assert.deepEqual(
  business.getRecipeMatches().visibleRecipes.map((recipe) => recipe.name),
  ['牛腩煲'],
  '肉类筛选规则保持“包含即出现”',
);

state.selectedMeats.clear();
state.selectedVegetables.add('番茄');
assert.deepEqual(
  business.getRecipeMatches().visibleRecipes.map((recipe) => recipe.name),
  ['番茄小菜'],
  '蔬菜筛选仍保持严格子集规则',
);

state.selectedVegetables.clear();
assert.deepEqual(business.getRecipeMatches().visibleRecipes, [], '无选择时仍返回空结果');

console.log('business ok');