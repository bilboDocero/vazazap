/**
 * CommercialPanel component — renders the WhatsApp Business "Ferramentas comerciais"
 * sidebar panel as shown in the reference design.
 */

import { COMMERCIAL_TOOLS_SECTIONS } from '../lib/commercial-content.js';
import { escapeHtml } from '../lib/utils.js';

export function renderCommercialPanel({ selectedId = 'anunciar', onSelect }) {
  const panel = document.createElement('section');
  panel.className = 'commercial-panel';
  panel.setAttribute('aria-label', 'Anunciar');

  panel.innerHTML = `
    <header class="commercial-header">
      <h1 class="commercial-title">Anunciar</h1>
      <p class="commercial-panel-intro">Dê visibilidade ao que você faz.</p>
    </header>
    <div class="commercial-scroll-area"></div>
  `;

  const scrollArea = panel.querySelector('.commercial-scroll-area');

  COMMERCIAL_TOOLS_SECTIONS.forEach((section, index) => {
    if (index > 0) {
      const divider = document.createElement('div');
      divider.className = 'commercial-section-divider';
      scrollArea.appendChild(divider);
    }

    const sectionEl = document.createElement('div');
    sectionEl.className = 'commercial-section';

    const heading = document.createElement('h2');
    heading.className = 'commercial-section-title';
    heading.textContent = section.title;
    sectionEl.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'commercial-list';

    section.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'commercial-item-row';
      row.dataset.id = item.id;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `${item.name}: ${item.description}`);

      row.innerHTML = `
        <div class="commercial-item-icon">
          ${item.iconSvg}
        </div>
        <div class="commercial-item-info">
          <div class="commercial-item-name">${escapeHtml(item.name)}</div>
          <div class="commercial-item-desc">${escapeHtml(item.description)}</div>
        </div>
      `;

      const selectAction = () => {
        applyActive(item.id);
        if (onSelect) onSelect(item.id);
      };

      row.addEventListener('click', selectAction);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAction();
        }
      });

      list.appendChild(row);
    });

    sectionEl.appendChild(list);
    scrollArea.appendChild(sectionEl);
  });

  function applyActive(id) {
    selectedId = id;
    panel.querySelectorAll('.commercial-item-row').forEach((row) => {
      row.classList.toggle('active', row.dataset.id === id);
    });
  }

  panel.setActive = (id) => {
    applyActive(id);
  };

  applyActive(selectedId);
  return panel;
}
