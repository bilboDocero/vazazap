import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getResenhaGroups } from '../../src/lib/community-resenha.js';
import { getCommunitiesData, findCommunitySelection } from '../../src/lib/communities-content.js';
import { renderCommunitiesDetail } from '../../src/components/CommunitiesDetail.js';

describe('Memes e Resenha', () => {
  it('identifies original fictional reactions and provides visual memes', () => {
    const groups = getResenhaGroups();
    const messages = groups.flatMap(group => group.messages);
    expect(groups).toHaveLength(3);
    expect(messages.length).toBeGreaterThanOrEqual(30);
    expect(messages.filter(msg => msg.meme).length).toBeGreaterThan(messages.length / 2);
    expect(new Set(messages.map(msg => msg.id)).size).toBe(messages.length);
    expect(messages.every(msg => msg.fictional && msg.label === 'Reação fictícia')).toBe(true);
    expect(messages.every(msg => msg.date === 'Resenha simulada')).toBe(true);
    expect(new Set(messages.map(msg => msg.sender)).size).toBeGreaterThan(3);
  });

  it.each(['fofocas-memes', 'fofocas-famosos'])('explains each reaction in %s and keeps archive links valid', (groupId) => {
    const group = getResenhaGroups().find(group => group.id === groupId);
    const raw = JSON.parse(readFileSync('data/messages.json', 'utf8'));
    const archived = new Set((Array.isArray(raw) ? raw : raw.messages).map(msg => msg.id));
    for (const msg of group.messages) {
      expect(msg.context.text).toBeTruthy();
      expect(Array.isArray(msg.context.links)).toBe(true);
      if (groupId === 'fofocas-famosos') expect(msg.context.links.length).toBeGreaterThan(0);
      for (const link of msg.context.links) {
        const match = /^#\/chat\/martha-graeff\/msg\/(\d+)$/.exec(link.url);
        if (match) expect(archived.has(Number(match[1]))).toBe(true);
        else expect(new URL(link.url).protocol).toBe('https:');
      }
    }
  });

  it('explains the correction when joking about the disputed lindão attribution', () => {
    const messages = getResenhaGroups().find(group => group.id === 'fofocas-famosos').messages;
    const disputed = messages.filter(msg => msg.context.text.includes('“Lindão”'));
    expect(disputed.length).toBeGreaterThan(0);
    for (const msg of disputed) {
      expect(msg.context.text).toContain('liminar');
      expect(msg.context.text).toContain('juiz entendeu que Nikolas disse “Dani”');
      expect(msg.context.links[0].url).toContain('justica-eleitoral-manda-remover');
    }
  });

  it.each([
    ['fofocas-memes', '#/chat/martha-graeff/msg/10975'],
    ['fofocas-famosos', '#/chat/martha-graeff/msg/31201'],
  ])('shows expandable context and working deep links in %s', (groupId, archiveUrl) => {
    const container = document.createElement('div');
    const selection = findCommunitySelection(getCommunitiesData(), groupId);
    renderCommunitiesDetail(container, { selection });
    expect(container.querySelector('.communities-notice-banner').textContent).toContain('reações fictícios');
    expect(container.querySelectorAll('.communities-bubble-checks')).toHaveLength(0);
    expect(container.querySelectorAll('.communities-meme-card').length).toBeGreaterThan(0);
    const contexts = container.querySelectorAll('.communities-reaction-context');
    expect(contexts).toHaveLength(selection.group.messages.length);
    expect([...contexts].every(details => !details.open)).toBe(true);
    expect(container.querySelector(`a[href="${archiveUrl}"]`)).not.toBeNull();
    const external = container.querySelector('.communities-reaction-context a[href^="https:"]');
    expect(external.rel).toContain('noopener');
    const card = container.querySelector('.communities-meme-card');
    expect(card.compareDocumentPosition(card.parentElement.querySelector('.communities-bubble-text')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('escapes creative content and rejects unsafe contextual links', () => {
    const container = document.createElement('div');
    renderCommunitiesDetail(container, { selection: {
      type: 'group', community: { name: 'Teste', simulated: true }, group: { name: 'Resenha', messages: [{
        id: 'untrusted', text: 'Texto', meme: { title: '<img src=x onerror=alert(1)>', punchline: '<script>bad()</script>', theme: 'invalid' },
        context: { text: '<script>bad()</script>', links: [{ url: 'javascript:alert(1)', label: 'Unsafe' }] },
      }] },
    } });
    expect(container.querySelectorAll('script, .communities-meme-card img, .communities-reaction-context a')).toHaveLength(0);
    expect(container.querySelector('.communities-meme-card h3').textContent).toContain('<img');
    expect(container.querySelector('.communities-meme-card').classList.contains('communities-meme-card--green')).toBe(true);
  });
});
