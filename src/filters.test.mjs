import assert from 'node:assert/strict';

import {
  filterRecipesByMeats,
  filterRecipesByVegetables,
  getVisibleRecipes,
  mergeRecipeResults,
} from './filters.js';

const recipes = [
  { id: 'r1', vegetables: ['番茄'], meats: [] },
  { id: 'r2', vegetables: ['番茄', '黄瓜'], meats: [] },
  { id: 'r3', vegetables: ['番茄', '黄瓜', '洋葱'], meats: [] },
  { id: 'r4', vegetables: [], meats: ['牛腩'] },
  { id: 'r5', vegetables: ['番茄'], meats: ['牛腩'] },
];

assert.deepEqual(
  filterRecipesByVegetables(['番茄', '黄瓜'], recipes).map((recipe) => recipe.id),
  ['r1', 'r2'],
  '蔬菜筛选时，菜谱必须只包含已选蔬菜且不能包含肉类',
);

assert.equal(
  filterRecipesByVegetables(['番茄', '黄瓜'], recipes).some((recipe) => recipe.id === 'r3'),
  false,
  '包含未选蔬菜的菜谱不应出现',
);

assert.equal(
  filterRecipesByVegetables(['番茄'], recipes).some((recipe) => recipe.id === 'r5'),
  false,
  '仅选蔬菜时，不应混入包含肉类的菜谱',
);

assert.deepEqual(
  filterRecipesByMeats(['牛腩'], recipes).map((recipe) => recipe.id),
  ['r4', 'r5'],
  '肉类筛选应遵循包含即出现规则',
);

assert.deepEqual(
  mergeRecipeResults([recipes[0], recipes[4]], [recipes[4]]).map((recipe) => recipe.id),
  ['r1', 'r5'],
  '合并结果应按 id 去重',
);

assert.deepEqual(
  getVisibleRecipes({ selectedVegetables: [], selectedMeats: [], recipes }).map((recipe) => recipe.id),
  [],
  '无选择时应保持空列表，等待食材选择',
);

console.log('filters ok');

