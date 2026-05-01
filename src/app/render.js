function getRecipeDifficultyStars(difficulty) {
  if (difficulty === '简单') {
    return '★☆☆☆☆';
  }

  if (difficulty === '困难') {
    return '★★★★☆';
  }

  return '★★★☆☆';
}

function getRecipeIllustration(recipe) {
  if ((recipe.meats || []).length > 0 && (recipe.vegetables || []).length > 0) {
    return '🍲';
  }

  if ((recipe.meats || []).length > 0) {
    return '🍖';
  }

  if ((recipe.vegetables || []).length > 0) {
    return '🥗';
  }

  return '🍳';
}

function getIngredientSectionMeta(category, categoryLabel) {
  if (category === 'vegetable') {
    return {
      title: `🥬 ${categoryLabel}`,
      subtitle: '挑几样蔬菜，看看能做哪些清爽小菜',
      kicker: 'Left Door · Upper Shelf',
      emptyHint: '还没有蔬菜，先加一个常用食材吧。',
    };
  }

  return {
    title: `🍖 ${categoryLabel}`,
    subtitle: '选上喜欢的肉类，冰箱会帮你推荐下饭菜',
    kicker: 'Left Door · Lower Shelf',
    emptyHint: '还没有肉类，先补几个常做主菜的食材吧。',
  };
}

export function createRenderer({ appElement, state, business, categoryLabels }) {
  function renderHeader(meta) {
    const safeIngredientQuery = business.escapeHtml(state.ingredientQuery);
    const safeRecipeQuery = business.escapeHtml(state.recipeQuery);

    return `
      <header class="app-header">
        <section class="brand-card">
          <div class="brand-icon" aria-hidden="true">🧊</div>
          <div class="brand-copy">
            <h1>Manji Fridge</h1>
            <p>打开冰箱，看看今天可以做什么</p>
          </div>
        </section>

        <section class="search-bar-group">
          <label class="search-pill search-pill--ingredients">
            <span class="search-pill__label">搜索食材</span>
            <div class="search-pill__input-wrap">
              <span class="search-pill__icon" aria-hidden="true">🥬</span>
              <input
                type="search"
                value="${safeIngredientQuery}"
                placeholder="例如：牛腩 / 西兰花"
                data-action="search-ingredients"
                autocomplete="off"
              />
            </div>
          </label>

          <label class="search-pill search-pill--recipes">
            <span class="search-pill__label">搜索菜谱</span>
            <div class="search-pill__input-wrap">
              <span class="search-pill__icon" aria-hidden="true">🍳</span>
              <input
                type="search"
                value="${safeRecipeQuery}"
                placeholder="例如：番茄炒蛋"
                data-action="search-recipes"
                autocomplete="off"
              />
            </div>
          </label>
        </section>

        <section class="header-stats">
          <article class="stat-chip stat-chip--selected">
            <small>已选食材</small>
            <strong>${meta.activeSelectionCount}</strong>
          </article>
          <article class="stat-chip stat-chip--matched">
            <small>匹配菜谱</small>
            <strong>${meta.visibleRecipeCount}</strong>
          </article>
          <article class="tiny-note" aria-hidden="true">
            <span class="tiny-note__heart">❤</span>
            好好吃饭<br />
            好好生活
          </article>
        </section>
      </header>
    `;
  }

  function renderIngredientCard(category, ingredient, selectedSet) {
    const isSelected = selectedSet.has(ingredient.name);
    const safeName = business.escapeHtml(ingredient.name);
    const safeNote = business.escapeHtml(ingredient.note || (ingredient.isDefault ? '默认食材' : '自定义食材'));
    const safeIcon = business.escapeHtml(ingredient.icon || ingredient.name.slice(0, 1));

    return `
      <article class="ingredient-card ${isSelected ? 'is-selected' : ''}">
        <span class="magnet-pin" aria-hidden="true"></span>
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
          class="delete-button delete-button--mini"
          data-action="delete-ingredient"
          data-id="${ingredient.id}"
          aria-label="删除 ${safeName}"
        >
          ×
        </button>
      </article>
    `;
  }

  function renderIngredientSection(category) {
    const ingredients = business.getFilteredIngredientsByCategory(category);
    const selectedSet = category === 'vegetable' ? state.selectedVegetables : state.selectedMeats;
    const hiddenDefaultCount = business.getHiddenDefaultCount(category);
    const ingredientQuery = business.normalizeSearchQuery(state.ingredientQuery);
    const safeIngredientQuery = business.escapeHtml(state.ingredientQuery.trim());
    const meta = getIngredientSectionMeta(category, categoryLabels[category]);
    const searchHint = ingredientQuery ? `没有匹配“${safeIngredientQuery}”的${categoryLabels[category]}。` : '';

    return `
      <section class="ingredient-section ingredient-section--${category}">
        <div class="section-head">
          <div>
            <p class="section-kicker">${meta.kicker}</p>
            <h2>${meta.title}</h2>
            <p class="section-subtitle">${meta.subtitle}</p>
          </div>
          <div class="section-actions">
            <button class="ghost-button" data-action="open-modal" data-category="${category}">添加</button>
            ${
              hiddenDefaultCount > 0
                ? `<button class="ghost-button" data-action="restore-defaults" data-category="${category}">恢复默认 ${hiddenDefaultCount}</button>`
                : ''
            }
            ${
              category === 'meat'
                ? '<button class="ghost-button ghost-button--danger" data-action="clear-selections">清空选择</button>'
                : ''
            }
          </div>
        </div>

        <div class="ingredient-section__body">
          <div class="ingredient-grid">
            ${
              ingredients.length
                ? ingredients.map((ingredient) => renderIngredientCard(category, ingredient, selectedSet)).join('')
                : `<p class="empty-state empty-state--compact">${searchHint || meta.emptyHint}</p>`
            }
          </div>
        </div>
      </section>
    `;
  }

  function renderRecipeNote(recipe, index) {
    const isPreset = state.presetRecipeIds.has(recipe.id);
    const tags = (recipe.tags || []).slice(0, 2);
    const difficultyStars = getRecipeDifficultyStars(recipe.difficulty);
    const illustration = getRecipeIllustration(recipe);

    return `
      <article class="recipe-note recipe-note--tone-${(index % 4) + 1}">
        <span class="recipe-note__pin" aria-hidden="true"></span>
        <span class="recipe-note__tape" aria-hidden="true"></span>
        <button class="recipe-note__main" data-action="open-recipe" data-id="${recipe.id}">
          <div class="recipe-note__image" aria-hidden="true">
            <span>${illustration}</span>
          </div>
          <strong>${recipe.name}</strong>
          <div class="recipe-tags">
            ${tags.length ? tags.map((tag) => `<span>${tag}</span>`).join('') : '<span>家常菜</span>'}
          </div>
          <div class="recipe-note__meta">
            <small>⏱ ${recipe.cookTime} 分钟</small>
            <small>难度：${difficultyStars}</small>
          </div>
        </button>
        <button
          class="recipe-note__action"
          data-action="toggle-preset"
          data-id="${recipe.id}"
          aria-label="${isPreset ? '移除预选' : '加入预选'} ${recipe.name}"
        >
          ${isPreset ? '♥' : '♡'}
        </button>
      </article>
    `;
  }

  function renderEmptyRecipeState(meta) {
    const hasRecipeQuery = Boolean(meta.recipeQuery);
    const hasSelection = meta.activeSelectionCount > 0;

    const title = hasSelection || hasRecipeQuery ? '这组搭配暂时没有找到合适菜谱' : '先从左边挑一些食材吧';
    const desc = hasSelection || hasRecipeQuery ? '试试再加一种食材，也许会有惊喜。' : '冰箱还在等你放入今天的灵感';

    return `
      <article class="fridge-empty-note">
        <span class="fridge-empty-note__pin" aria-hidden="true"></span>
        <span class="fridge-empty-note__icon" aria-hidden="true">🧊</span>
        <h3>${title}</h3>
        <p>${desc}</p>
        <div class="fridge-empty-note__decor" aria-hidden="true">
          <span class="empty-decor empty-decor--mint">试试番茄 + 鸡蛋</span>
          <span class="empty-decor empty-decor--warm">今晚吃点热乎的</span>
          <span class="empty-decor empty-decor--sky">冰箱灵感等待中</span>
        </div>
      </article>
    `;
  }

  function renderRecipeDoor(meta) {
    const recipeQuery = business.normalizeSearchQuery(state.recipeQuery);
    const hasRecipeQuery = Boolean(recipeQuery);
    const recipePool = meta.activeSelectionCount === 0 && hasRecipeQuery ? business.normalizedRecipes : meta.visibleRecipes;
    const visibleNotes = hasRecipeQuery
      ? recipePool.filter((recipe) => business.recipeNameMatchesQuery(recipe, recipeQuery))
      : recipePool;

    const summaryText =
      meta.activeSelectionCount > 0
        ? `从你的冰箱食材里，找到 ${visibleNotes.length} 道合适菜谱`
        : hasRecipeQuery
          ? `当前根据菜名搜索命中 ${visibleNotes.length} 道菜谱`
          : '右门初始为空，请先从左门选择食材。';

    return `
      <section class="fridge-preview">
        <div class="fridge-preview__head">
          <div>
            <p class="section-kicker">Right Door · Recipe Notes</p>
            <h2>🍳 今日推荐</h2>
            <p class="section-subtitle">${summaryText}</p>
          </div>
          <button class="ghost-button ghost-button--swap" disabled aria-disabled="true" type="button">
            ↻ 换一批
          </button>
        </div>

        <div class="fridge-preview__list">
          ${
            visibleNotes.length
              ? visibleNotes.map((recipe, index) => renderRecipeNote(recipe, index)).join('')
              : renderEmptyRecipeState({ activeSelectionCount: meta.activeSelectionCount, recipeQuery })
          }
        </div>
      </section>
    `;
  }

  function renderPresetTray() {
    const presetRecipes = business.getPresetRecipes();

    return `
      <section class="preset-tray">
        <div class="preset-tray__header">
          <div>
            <p class="section-kicker">Preset Tray</p>
            <h2>🧺 今天想做</h2>
            <p class="section-subtitle">把喜欢的菜谱放到这里，方便随时查看</p>
          </div>
          ${
            presetRecipes.length
              ? '<button class="ghost-button" data-action="clear-presets">清空预选</button>'
              : '<span class="preset-empty-hint">加入后会自动本地保存</span>'
          }
        </div>

        <div class="preset-list">
          ${
            presetRecipes.length
              ? presetRecipes
                  .map(
                    (recipe) => `
                      <article class="preset-chip">
                        <span class="preset-chip__thumb" aria-hidden="true">${getRecipeIllustration(recipe)}</span>
                        <button class="preset-chip__main" data-action="open-recipe" data-id="${recipe.id}">
                          <strong>${recipe.name}</strong>
                          <small>${recipe.cookTime} 分钟 · ${recipe.difficulty}</small>
                        </button>
                        <button
                          class="delete-button delete-button--mini"
                          data-action="toggle-preset"
                          data-id="${recipe.id}"
                          aria-label="移除 ${recipe.name}"
                        >
                          ×
                        </button>
                      </article>
                    `,
                  )
                  .join('')
              : '<p class="empty-state">还没有预选菜谱，先从右门挑一道喜欢的菜吧。</p>'
          }
          <div class="preset-empty-slot" aria-hidden="true">+ 添加更多菜谱</div>
        </div>
        <div class="preset-tray__handle" aria-hidden="true"></div>
      </section>
    `;
  }

  function renderFridgeShell(meta) {
    return `
      <section class="fridge-shell">
        <div class="fridge-shell__frame" aria-hidden="true"></div>
        <div class="fridge-shell__inner-rim" aria-hidden="true"></div>
        <div class="fridge-shell__shine" aria-hidden="true"></div>
        <div class="fridge-shell__corners" aria-hidden="true"></div>
        <div class="fridge-doors">
          <section class="fridge-door fridge-door--left">
            ${renderIngredientSection('vegetable')}
            ${renderIngredientSection('meat')}
          </section>

          <div class="fridge-divider" aria-hidden="true">
            <span class="fridge-seam"></span>
            <span class="fridge-seam-shadow"></span>
            <span class="fridge-handle fridge-handle--left"></span>
            <span class="fridge-handle fridge-handle--right"></span>
          </div>

          <section class="fridge-door fridge-door--right">
            ${renderRecipeDoor(meta)}
          </section>
        </div>

        ${renderPresetTray()}
      </section>
    `;
  }

  function renderRecipeDrawer() {
    const recipe = business.getActiveRecipe();

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
            <h2>新增${categoryLabels[category]}</h2>
          </div>
          <button class="drawer-close" data-action="close-modal" aria-label="关闭新增食材">×</button>
        </div>
        <form id="ingredient-form" class="modal-form">
          <input type="hidden" name="category" value="${category}" />
          <label>
            食材名称
            <input id="ingredient-name" name="name" value="${business.escapeHtml(draft.name)}" maxlength="20" placeholder="例如：生菜" />
          </label>
          <label>
            图标文字（可选）
            <input name="icon" value="${business.escapeHtml(draft.icon)}" maxlength="2" placeholder="例如：生" />
          </label>
          <label>
            备注（可选）
            <textarea name="note" rows="3" maxlength="30" placeholder="例如：适合凉拌、做沙拉">${business.escapeHtml(draft.note)}</textarea>
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

  function renderAppShell(meta) {
    return `
      <div class="page-shell">
        ${renderHeader(meta)}
        <main class="fridge-stage">
          ${renderFridgeShell(meta)}
        </main>
        ${renderRecipeDrawer()}
        ${renderModal()}
      </div>
    `;
  }

  function render(options = {}) {
    const preserveScroll = Boolean(options.preserveScroll);
    const focusSelector = typeof options.focusSelector === 'string' ? options.focusSelector : '';
    const cursorPosition = Number.isInteger(options.cursorPosition) ? options.cursorPosition : null;
    const previousScrollY = preserveScroll ? window.scrollY : null;
    const previousIngredientPanelScroll = preserveScroll
      ? {
          vegetable: document.querySelector('.ingredient-section--vegetable .ingredient-section__body')?.scrollTop || 0,
          meat: document.querySelector('.ingredient-section--meat .ingredient-section__body')?.scrollTop || 0,
        }
      : null;
    const previousPreviewDoorScroll = preserveScroll ? document.querySelector('.fridge-preview__list')?.scrollTop || 0 : 0;
    const { visibleRecipes } = business.getRecipeMatches();
    const activeSelectionCount = state.selectedVegetables.size + state.selectedMeats.size;

    appElement.innerHTML = renderAppShell({
      visibleRecipes,
      activeSelectionCount,
      visibleRecipeCount: visibleRecipes.length,
    });

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

  return {
    render,
  };
}
