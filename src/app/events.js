export function registerAppEvents({ appElement, actions }) {
  appElement.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');

    if (!target) {
      return;
    }

    const action = target.dataset.action;

    if (action === 'toggle-ingredient') {
      actions.toggleIngredient(target.dataset.category, target.dataset.name);
      return;
    }

    if (action === 'open-modal') {
      actions.openModal(target.dataset.category);
      return;
    }

    if (action === 'close-modal') {
      actions.closeModal();
      return;
    }

    if (action === 'delete-ingredient') {
      actions.deleteIngredient(target.dataset.id);
      return;
    }

    if (action === 'restore-defaults') {
      actions.restoreDefaults(target.dataset.category);
      return;
    }

    if (action === 'clear-selections') {
      actions.clearSelections();
      return;
    }

    if (action === 'toggle-preset') {
      actions.togglePreset(target.dataset.id);
      return;
    }

    if (action === 'clear-presets') {
      actions.clearPresets();
      return;
    }

    if (action === 'open-recipe') {
      actions.openRecipe(target.dataset.id);
      return;
    }

    if (action === 'close-recipe') {
      actions.closeRecipe();
    }
  });

  appElement.addEventListener('submit', (event) => {
    if (event.target.id !== 'ingredient-form') {
      return;
    }

    event.preventDefault();
    actions.addIngredient(event.target);
  });

  appElement.addEventListener('input', (event) => {
    const target = event.target.closest('[data-action]');

    if (!target) {
      return;
    }

    const action = target.dataset.action;
    const isSearchInput = action === 'search-ingredients' || action === 'search-recipes';
    const isComposing = event.isComposing || target.dataset.isComposing === 'true';

    if (!isSearchInput) {
      return;
    }

    if (action === 'search-ingredients') {
      actions.updateIngredientQuery({
        value: target.value,
        selectionStart: target.selectionStart,
        isComposing,
      });
      return;
    }

    actions.updateRecipeQuery({
      value: target.value,
      selectionStart: target.selectionStart,
      isComposing,
    });
  });

  appElement.addEventListener('compositionstart', (event) => {
    const target = event.target.closest('[data-action]');

    if (!target) {
      return;
    }

    if (target.dataset.action !== 'search-ingredients' && target.dataset.action !== 'search-recipes') {
      return;
    }

    target.dataset.isComposing = 'true';
  });

  appElement.addEventListener('compositionend', (event) => {
    const target = event.target.closest('[data-action]');

    if (!target) {
      return;
    }

    const action = target.dataset.action;

    if (action !== 'search-ingredients' && action !== 'search-recipes') {
      return;
    }

    target.dataset.isComposing = 'false';

    if (action === 'search-ingredients') {
      actions.updateIngredientQuery({
        value: target.value,
        selectionStart: target.selectionStart,
        fromCompositionEnd: true,
      });
      return;
    }

    actions.updateRecipeQuery({
      value: target.value,
      selectionStart: target.selectionStart,
      fromCompositionEnd: true,
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    actions.handleEscape();
  });
}