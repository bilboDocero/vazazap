/** Discovery cues shared by desktop and mobile navigation. */
const shortcuts = {
  status: { label: 'Atualizações', description: 'Explore os status e canais disponíveis' },
  vitrine: { label: 'Vitrine', description: 'Explore produtos, serviços e ofertas na Vitrine' },
  anunciar: { label: 'Anunciar', description: '2 formatos disponíveis para anunciar: Status e Vitrine', badge: '2' },
};

export function highlightNavigationShortcut(button, key, { mobile = false } = {}) {
  const shortcut = shortcuts[key];
  if (!shortcut) return;
  button.classList.add('nav-feature');
  button.dataset.feature = key;
  button.setAttribute('aria-description', shortcut.description);
  button.title = `${shortcut.label} · ${shortcut.description}`;
  const indicator = document.createElement('span');
  indicator.className = `nav-feature-indicator ${shortcut.badge ? 'nav-feature-indicator--count' : 'nav-feature-indicator--dot'}`;
  indicator.textContent = shortcut.badge || '';
  indicator.setAttribute('aria-hidden', 'true');
  (mobile ? button.querySelector('.sidebar-bottom-tab-icon') : button).appendChild(indicator);
  if (!mobile) {
    const caption = document.createElement('span');
    caption.className = 'nav-feature-caption';
    caption.textContent = shortcut.label;
    caption.setAttribute('aria-hidden', 'true');
    button.appendChild(caption);
  }
}
