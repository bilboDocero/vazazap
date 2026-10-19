/** Global message search with cancellable requests and small result pages. */
import { escapeHtml, formatDateShort } from '../lib/utils.js';
import { searchPage } from '../lib/search.js';

const DEBOUNCE_MS = 200;
const PAGE_SIZE = 50;
const SUGGESTED_TERMS = ['peleleca', 'colação', 'careca', 'Banco Central', 'Galípolo', 'Esteves', 'Londres', 'sem nota'];

/** @param {function} onResultClick Receives the message and its conversation ID. */
export function attachSearch(sidebar, onResultClick) {
  const input = sidebar.querySelector('.sidebar-search-input');
  const listContainer = sidebar.querySelector('.conversation-list');
  let resultsEl = null, resultList = null, feedback = null, more = null;
  let debounceTimer = null, controller = null;
  let version = 0, destroyed = false;
  let activeSuggestion = -1;
  const searchArea = input.closest('.sidebar-search') || input.parentElement;
  const suggestions = document.createElement('section');
  suggestions.className = 'search-suggestions';
  suggestions.hidden = true;
  suggestions.innerHTML = '<h2 class="search-suggestions-title" id="global-search-suggestions-title">Sugestões de busca</h2><div class="search-suggestions-list" id="global-search-suggestions" role="listbox" aria-labelledby="global-search-suggestions-title"></div>';
  const suggestionList = suggestions.querySelector('.search-suggestions-list');
  const suggestionButtons = SUGGESTED_TERMS.map((term, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion';
    button.id = `global-search-suggestion-${index}`;
    button.tabIndex = -1;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    button.textContent = term;
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.addEventListener('click', () => selectSuggestion(term));
    suggestionList.appendChild(button);
    return button;
  });
  searchArea.appendChild(suggestions);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', suggestionList.id);
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('autocomplete', 'off');

  function hideSuggestions() {
    suggestions.hidden = true;
    activeSuggestion = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    for (const button of suggestionButtons) button.setAttribute('aria-selected', 'false');
  }

  function showSuggestions() {
    if (input.value.trim() || destroyed) return;
    suggestions.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function selectSuggestion(term) {
    input.value = term;
    hideSuggestions();
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    clearTimeout(debounceTimer);
    runSearch(term, 0, false, version);
  }

  function onOutsidePointer(event) {
    if (!searchArea.contains(event.target)) hideSuggestions();
  }

  function onFocusOut(event) {
    if (!searchArea.contains(event.relatedTarget)) hideSuggestions();
  }

  function hideResults() {
    resultsEl?.remove();
    resultsEl = resultList = feedback = more = null;
    listContainer.style.display = '';
  }

  function createResults() {
    hideResults();
    resultsEl = document.createElement('div');
    resultsEl.className = 'search-results';
    resultList = document.createElement('div');
    resultList.setAttribute('role', 'listbox');
    resultList.setAttribute('aria-label', 'Resultados da pesquisa');
    feedback = document.createElement('div');
    feedback.className = 'search-feedback';
    feedback.setAttribute('role', 'status');
    more = document.createElement('button');
    more.type = 'button';
    more.className = 'search-load-more';
    more.hidden = true;
    resultsEl.append(resultList, feedback, more);
    listContainer.style.display = 'none';
    listContainer.after(resultsEl);
  }

  function renderResult(result) {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.dataset.conversationId = result.conversationId;
    item.dataset.messageId = result.id;
    item.setAttribute('role', 'option');
    item.tabIndex = 0;
    const contact = document.createElement('span');
    contact.className = 'search-result-contact';
    contact.textContent = result.contactName;
    contact.title = result.contactName;
    const date = document.createElement('span');
    date.className = 'search-result-date';
    date.textContent = formatDateShort(result.date);
    const top = document.createElement('div');
    top.className = 'search-result-top';
    top.append(contact, date);
    const content = document.createElement('div');
    content.className = 'search-result-content';
    const { content: text, matchStart: start, matchEnd: end } = result;
    content.innerHTML = `${escapeHtml(text.slice(0, start))}<mark class="search-highlight">${escapeHtml(text.slice(start, end))}</mark>${escapeHtml(text.slice(end))}`;
    const sender = document.createElement('span');
    sender.className = 'search-result-sender';
    sender.textContent = `${result.sender === 'DV' ? 'Daniel Vorcaro' : result.sender}: `;
    content.prepend(sender);
    item.append(top, content);
    item.addEventListener('click', () => onResultClick(result));
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onResultClick(result); }
    });
    return item;
  }

  async function runSearch(query, cursor, append, requestVersion) {
    controller?.abort();
    const currentController = new AbortController();
    controller = currentController;
    if (!append) createResults();
    resultsEl.setAttribute('aria-busy', 'true');
    feedback.className = 'search-feedback';
    feedback.textContent = append ? 'Buscando mais mensagens…' : 'Pesquisando mensagens…';
    more.disabled = true;
    more.hidden = !append;
    try {
      const page = await searchPage(query, { cursor, limit: PAGE_SIZE, signal: currentController.signal });
      if (destroyed || requestVersion !== version || currentController.signal.aborted) return;
      const fragment = document.createDocumentFragment();
      for (const result of page.results) fragment.appendChild(renderResult(result));
      resultList.appendChild(fragment);
      feedback.className = resultList.childElementCount ? 'search-feedback' : 'search-empty';
      feedback.textContent = resultList.childElementCount ? '' : 'Nenhuma mensagem encontrada';
      more.textContent = 'Carregar mais resultados';
      more.disabled = false;
      more.hidden = page.nextCursor === null;
      more.onclick = () => runSearch(query, page.nextCursor, true, requestVersion);
    } catch (error) {
      if (destroyed || requestVersion !== version || error.name === 'AbortError') return;
      feedback.textContent = 'Não foi possível pesquisar as mensagens.';
      more.textContent = 'Tentar novamente';
      more.hidden = false;
      more.disabled = false;
      more.onclick = () => runSearch(query, cursor, append, requestVersion);
    } finally {
      if (!destroyed && requestVersion === version) resultsEl?.setAttribute('aria-busy', 'false');
    }
  }

  function onInput() {
    version++;
    controller?.abort();
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    hideSuggestions();
    if (!query && document.activeElement === input) showSuggestions();
    if (query.length < 2) { hideResults(); return; }
    // Hide old messages immediately, including while the next query is debouncing.
    hideResults();
    const requestVersion = version;
    debounceTimer = setTimeout(() => runSearch(query, 0, false, requestVersion), DEBOUNCE_MS);
  }

  function onKeyDown(event) {
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !input.value.trim()) {
      event.preventDefault();
      showSuggestions();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      activeSuggestion = activeSuggestion < 0
        ? (direction > 0 ? 0 : suggestionButtons.length - 1)
        : (activeSuggestion + direction + suggestionButtons.length) % suggestionButtons.length;
      suggestionButtons.forEach((button, index) => button.setAttribute('aria-selected', String(index === activeSuggestion)));
      const active = suggestionButtons[activeSuggestion];
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView?.({ block: 'nearest' });
      return;
    }
    if (event.key === 'Enter' && !suggestions.hidden && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(SUGGESTED_TERMS[activeSuggestion]);
      return;
    }
    if (event.key !== 'Escape') return;
    event.preventDefault();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    hideSuggestions();
    input.blur();
  }
  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('focus', showSuggestions);
  input.addEventListener('click', showSuggestions);
  searchArea.addEventListener('focusout', onFocusOut);
  document.addEventListener('pointerdown', onOutsidePointer);
  return {
    destroy() {
      destroyed = true;
      version++;
      controller?.abort();
      clearTimeout(debounceTimer);
      hideResults();
      hideSuggestions();
      suggestions.remove();
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('focus', showSuggestions);
      input.removeEventListener('click', showSuggestions);
      searchArea.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('pointerdown', onOutsidePointer);
      for (const attribute of ['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant', 'autocomplete']) input.removeAttribute(attribute);
    },
  };
}
