import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getJournalisticGroups, NEWS_REVIEWED_AT } from '../../src/lib/community-news.js';
import { getCommunitiesData, findCommunitySelection } from '../../src/lib/communities-content.js';
import { renderCommunitiesDetail } from '../../src/components/CommunitiesDetail.js';

describe('Journalistic community', () => {
  it('keeps every summary traceable to dated official or journalistic sources', () => {
    const groups = getJournalisticGroups();
    const messages = groups.flatMap(group => group.messages);
    expect(groups).toHaveLength(4);
    expect(messages.length).toBeGreaterThanOrEqual(30);
    expect(new Set(messages.map(msg => msg.id)).size).toBe(messages.length);
    for (const group of groups) {
      expect(group.messages.length).toBeGreaterThanOrEqual(6);
      expect(group.messages.filter(msg => msg.image).length).toBeGreaterThan(group.messages.length / 2);
      const dates = group.messages.map(msg => msg.publishedAt);
      expect(dates).toEqual([...dates].sort());
      for (const msg of group.messages) {
        expect(msg.sources.length).toBeGreaterThan(0);
        expect(msg.publishedAt).toBe(msg.sources[0].publishedAt);
        for (const source of msg.sources) {
          const url = new URL(source.url);
          expect(url.protocol).toBe('https:');
          expect([
            'noticias.stf.jus.br', 'agenciabrasil.ebc.com.br', 'www.gov.br', 'www12.senado.leg.br',
            'noticias.uol.com.br', 'www1.folha.uol.com.br', 'c-level.folha.uol.com.br',
            'www.cnnbrasil.com.br', 'www.infomoney.com.br', 'www.poder360.com.br', 'static.poder360.com.br',
          ]).toContain(url.hostname);
          expect(source.title).toBeTruthy();
          expect(source.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(source.publishedAt <= NEWS_REVIEWED_AT).toBe(true);
        }
      }
    }
  });

  it('includes responses to the allegations about Moraes and Toffoli', () => {
    const group = getJournalisticGroups().find(group => group.id === 'plantao-stf-documentos');
    const text = group.messages.map(msg => `${msg.title} ${msg.text}`).join(' ');
    expect(text).toContain('Moraes negou');
    expect(text).toContain('o ministro não teve acesso');
    expect(text).toContain('não comprova');
    expect(text).toContain('PGR');
    expect(group.messages.at(-1).publishedAt).toBe('2026-10-22');
  });

  it('ships photographs with credits, descriptions and original publication links', () => {
    const messages = getJournalisticGroups().flatMap(group => group.messages);
    const images = messages.filter(msg => msg.image).map(msg => msg.image);
    expect(images.length).toBeGreaterThan(messages.length / 2);
    for (const image of images) {
      expect(existsSync(resolve('public', image.src.slice(1)))).toBe(true);
      expect(image.alt).toBeTruthy();
      expect(image.credit).toBeTruthy();
      expect(image.sourceUrl).toMatch(/^https:/);
      expect(image.originalUrl).toMatch(/^https:/);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
    }
  });

  it('renders readable source links and lazy photos without pretending delivery receipts', () => {
    const container = document.createElement('div');
    const selection = findCommunitySelection(getCommunitiesData(), 'plantao-avisos');
    renderCommunitiesDetail(container, { selection });
    expect(container.textContent).toContain('Revisado em 23/10/2026');
    expect(container.querySelectorAll('.communities-news-title')).toHaveLength(selection.group.messages.length);
    expect(container.querySelectorAll('.communities-bubble-checks')).toHaveLength(0);
    const image = container.querySelector('.communities-news-image img');
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(image.getAttribute('alt')).toBeTruthy();
    const bubble = image.closest('.communities-bubble');
    expect(image.compareDocumentPosition(bubble.querySelector('.communities-news-title')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(image.compareDocumentPosition(bubble.querySelector('.communities-bubble-text')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const link of container.querySelectorAll('.communities-news-sources a')) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(link.parentElement.textContent).toContain('Fonte publicada em');
    }
  });

  it('escapes summaries and rejects unsafe source links in stored communities', () => {
    const container = document.createElement('div');
    renderCommunitiesDetail(container, { selection: {
      type: 'group', community: { name: 'Teste' }, group: {
        name: 'Avisos', messages: [{ id: 'unsafe', title: '<img src=x onerror=alert(1)>', text: '<script>alert(1)</script>', sources: [{ url: 'javascript:alert(1)', title: 'Unsafe' }] }],
      },
    } });
    expect(container.querySelectorAll('script, .communities-news-title img, .communities-news-sources a')).toHaveLength(0);
    expect(container.querySelector('.communities-news-title').textContent).toContain('<img');
  });
});
