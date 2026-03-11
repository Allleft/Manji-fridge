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
  return name.trim().replace(/\s+/g, '').toLocaleLowerCase();
}

function getVisibleIngredients() {
  return [...DEFAULT_INGREDIENTS, ...state.customIngredients].filter(
    (ingredient) => !state.hiddenIngredientIds.has(ingredient.id) && !ingredient.isHidden,
  );
}

function getIngredientsByCategory(category) {
  return getVisibleIngredients().filter((ingredient) => ingredient.category === category);
}

function getHiddenDefaultCount(category) {
  return DEFAULT_INGREDIENTS.filter(
    (ingredient) => ingredient.category === category && state.hiddenIngredientIds.has(ingredient.id),
  ).length;
}

function getRecipeMatches() {
  const selectedVegetables = [...state.selectedVegetables];
  const selectedMeats = [...state.selectedMeats];
  const vegetableMatches = filterRecipesByVegetables(selectedVegetables, RECIPES);
  const meatMatches = filterRecipesByMeats(selectedMeats, RECIPES);
  const visibleRecipes = getVisibleRecipes({ selectedVegetables, selectedMeats, recipes: RECIPES });

  return {
    visibleRecipes,
    vegetableMatchIds: new Set(vegetableMatches.map((recipe) => recipe.id)),
    meatMatchIds: new Set(meatMatches.map((recipe) => recipe.id)),
  };
}

function getActiveRecipe() {
  return RECIPES.find((recipe) => recipe.id === state.activeRecipeId) || null;
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
  const normalizedName = normalizeIngredientName(name);
  return [...DEFAULT_INGREDIENTS, ...state.customIngredients].some(
    (ingredient) =>
      ingredient.category === category && normalizeIngredientName(ingredient.name) === normalizedName,
  );
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
    state.modal.error = '食材名称不能为空。';
    render();
    return;
  }

  if (ingredientExists(name, category)) {
    state.modal.error = '同一分类下已存在同名食材，请换一个名称。';
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

  if (ingredient.category === 'vegetable') {
    state.selectedVegetables.delete(ingredient.name);
  } else {
    state.selectedMeats.delete(ingredient.name);
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
  const ingredients = getIngredientsByCategory(category);
  const selectedSet = category === 'vegetable' ? state.selectedVegetables : state.selectedMeats;
  const hiddenDefaultCount = getHiddenDefaultCount(category);
  const emptyHint = category === 'vegetable' ? '还没有蔬菜，先加一个常用食材吧。' : '还没有肉类，先补几个常做主菜的食材吧。';

  return `
    <section class="ingredient-section ingredient-section--${category}">
      <div class="section-head">
        <div>
          <p class="section-kicker">${category === 'vegetable' ? 'Upper Shelf' : 'Lower Shelf'}</p>
          <h2>${CATEGORY_LABELS[category]}</h2>
        </div>
        <div class="section-actions">
          <button class="ghost-button" data-action="open-modal" data-category="${category}">添加</button>
          ${
            hiddenDefaultCount > 0
              ? `<button class="ghost-button" data-action="restore-defaults" data-category="${category}">恢复默认 ${hiddenDefaultCount}</button>`
              : ''
          }
        </div>
      </div>
      <p class="section-rule">
        ${
          category === 'vegetable'
            ? '规则：菜谱中的蔬菜必须全部属于已选集合，且不能包含肉类。'
            : '规则：只要菜谱包含已选肉类，就直接出现。'
        }
      </p>
      <div class="ingredient-grid">
        ${
          ingredients.length
            ? ingredients
                .map((ingredient) => {
                  const isSelected = selectedSet.has(ingredient.name);
                  const safeName = escapeHtml(ingredient.name);
                  const safeNote = escapeHtml(ingredient.note || (ingredient.isDefault ? '默认食材' : '自定义食材'));
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
                      ${isSelected ? '<span class="ingredient-selected-tag">已选</span>' : ''}
                      <button
                        class="delete-button"
                        data-action="delete-ingredient"
                        data-id="${ingredient.id}"
                        aria-label="删除 ${safeName}"
                      >
                        ×
                      </button>
                    </article>
                  `;
                })
                .join('')
            : `<p class="empty-state empty-state--compact">${emptyHint}</p>`
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
  const presetRecipes = RECIPES.filter((recipe) => state.presetRecipeIds.has(recipe.id));

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
            : '<p class="empty-state">还没有预选菜谱，先从右侧卡片里挑一两道想做的吧。</p>'
        }
      </div>
    </section>
  `;
}

function render(options = {}) {
  const preserveScroll = Boolean(options.preserveScroll);
  const previousScrollY = preserveScroll ? window.scrollY : null;
  const { visibleRecipes, vegetableMatchIds, meatMatchIds } = getRecipeMatches();
  const activeSelectionCount = state.selectedVegetables.size + state.selectedMeats.size;

  app.innerHTML = `
    <div class="page-shell">
      <header class="hero">
        <div>
          <p class="hero-kicker">Manji Fridge Recipe Web App</p>
          <h1>冰箱里有什么，就先点什么</h1>
          <p class="hero-copy">
            用双开门冰箱式界面管理现有食材，左边勾食材，右边即时看能做什么菜，底部随手收进预选区。
          </p>
        </div>
        <div class="hero-stats">
          <article>
            <strong>${getVisibleIngredients().length}</strong>
            <span>当前食材</span>
          </article>
          <article>
            <strong>${visibleRecipes.length}</strong>
            <span>可见菜谱</span>
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
            <p class="fridge-panel__hint">点击食材即高亮，取消点击可撤销选择。</p>
            <button class="ghost-button" data-action="clear-selections">清空已选食材</button>
          </div>
          <div class="fridge-shell">
            <div class="fridge-shell__glow"></div>
            <div class="fridge-handle fridge-handle--left"></div>
            <div class="fridge-handle fridge-handle--right"></div>
            ${renderIngredientSection('vegetable')}
            ${renderIngredientSection('meat')}
          </div>
        </section>

        <section class="recipes-panel">
          <div class="recipes-head">
            <div>
              <p class="section-kicker">Recipe Board</p>
              <h2>${activeSelectionCount ? '即时推荐结果' : '全部菜谱浏览'}</h2>
              <p class="recipes-subtitle">
                ${
                  activeSelectionCount
                    ? '蔬菜筛选仅展示纯蔬菜菜谱，肉类筛选继续按包含即出现。'
                    : '先看看现有菜谱也可以，随时点左侧食材缩小范围。'
                }
              </p>
            </div>
            <div class="recipes-summary">
              <span>${visibleRecipes.length} 道菜</span>
            </div>
          </div>
          <div class="recipe-grid">
            ${
              visibleRecipes.length
                ? visibleRecipes
                    .map((recipe) =>
                      renderRecipeCard(recipe, {
                        matchesVegetable: vegetableMatchIds.has(recipe.id),
                        matchesMeat: meatMatchIds.has(recipe.id),
                      }),
                    )
                    .join('')
                : '<div class="empty-panel"><h3>暂时没有匹配结果</h3><p>试试减少蔬菜选择，或者添加一种肉类来放宽结果集。</p></div>'
            }
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






