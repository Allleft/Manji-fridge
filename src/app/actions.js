export function createActions({
  state,
  renderer,
  business,
  defaultIngredients,
  persistIngredientState,
  persistPresetState,
  confirmDelete = (message) => window.confirm(message),
}) {
  function toggleIngredient(category, ingredientName) {
    const targetSet = category === 'vegetable' ? state.selectedVegetables : state.selectedMeats;

    if (targetSet.has(ingredientName)) {
      targetSet.delete(ingredientName);
    } else {
      targetSet.add(ingredientName);
    }

    renderer.render({ preserveScroll: true });
  }

  function clearSelections() {
    state.selectedVegetables.clear();
    state.selectedMeats.clear();
    renderer.render({ preserveScroll: true });
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
    renderer.render();
  }

  function closeModal() {
    state.modal = {
      ...state.modal,
      isOpen: false,
      error: '',
    };
    renderer.render();
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
      renderer.render();
      return;
    }

    if (business.isBlockedIngredient({ name, category })) {
      state.modal.error = '该食材已被屏蔽，请换一个名称。';
      renderer.render();
      return;
    }

    if (business.ingredientExists(name, category)) {
      state.modal.error = '同一分类下已存在同名食材，请换一个名称。';
      renderer.render();
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

    persistIngredientState(state);
    closeModal();
  }

  function deleteIngredient(ingredientId) {
    const ingredient = [...defaultIngredients, ...state.customIngredients].find((item) => item.id === ingredientId);

    if (!ingredient) {
      return;
    }

    const confirmed = confirmDelete(`确定删除“${ingredient.name}”吗？`);
    if (!confirmed) {
      return;
    }

    const canonicalName = business.getCanonicalIngredientName(ingredient.name, ingredient.category);

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

    persistIngredientState(state);
    renderer.render();
  }

  function restoreDefaults(category) {
    defaultIngredients
      .filter((ingredient) => ingredient.category === category)
      .forEach((ingredient) => {
        state.hiddenIngredientIds.delete(ingredient.id);
      });

    persistIngredientState(state);
    renderer.render();
  }

  function togglePreset(recipeId) {
    if (state.presetRecipeIds.has(recipeId)) {
      state.presetRecipeIds.delete(recipeId);
    } else {
      state.presetRecipeIds.add(recipeId);
    }

    persistPresetState(state);
    renderer.render();
  }

  function clearPresets() {
    state.presetRecipeIds.clear();
    persistPresetState(state);
    renderer.render();
  }

  function openRecipe(recipeId) {
    state.activeRecipeId = recipeId;
    renderer.render();
  }

  function closeRecipe() {
    state.activeRecipeId = null;
    renderer.render();
  }

  function updateIngredientQuery({ value, selectionStart, isComposing = false, fromCompositionEnd = false }) {
    state.ingredientQuery = value || '';

    if (isComposing) {
      return;
    }

    renderer.render({
      preserveScroll: true,
      focusSelector: '[data-action="search-ingredients"]',
      cursorPosition: fromCompositionEnd
        ? state.ingredientQuery.length
        : selectionStart ?? state.ingredientQuery.length,
    });
  }

  function updateRecipeQuery({ value, selectionStart, isComposing = false, fromCompositionEnd = false }) {
    state.recipeQuery = value || '';

    if (isComposing) {
      return;
    }

    renderer.render({
      preserveScroll: true,
      focusSelector: '[data-action="search-recipes"]',
      cursorPosition: fromCompositionEnd ? state.recipeQuery.length : selectionStart ?? state.recipeQuery.length,
    });
  }

  function handleEscape() {
    if (state.modal.isOpen) {
      closeModal();
      return;
    }

    if (state.activeRecipeId) {
      closeRecipe();
    }
  }

  return {
    toggleIngredient,
    clearSelections,
    openModal,
    closeModal,
    addIngredient,
    deleteIngredient,
    restoreDefaults,
    togglePreset,
    clearPresets,
    openRecipe,
    closeRecipe,
    updateIngredientQuery,
    updateRecipeQuery,
    handleEscape,
  };
}