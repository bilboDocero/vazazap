import { describe, it, expect } from 'vitest';
import { AGENDA_CONTACTS, AGENDA_CATEGORIES, AGENDA_SOURCE } from '../../src/lib/agenda-content.js';
import { HashRouter } from '../../src/lib/router.js';

describe('Agenda Telefônica (Folha de S.Paulo 05/03/2026)', () => {
  describe('AGENDA_SOURCE metadata', () => {
    it('cites the Folha de S.Paulo news report correctly', () => {
      expect(AGENDA_SOURCE.publisher).toBe('Folha de S.Paulo');
      expect(AGENDA_SOURCE.date).toBe('2026-03-05');
      expect(AGENDA_SOURCE.url).toContain('folha.uol.com.br');
      expect(AGENDA_SOURCE.legalNote).toBeDefined();
    });
  });

  describe('AGENDA_CONTACTS', () => {
    it('contains all key names revealed by Folha de S.Paulo', () => {
      const names = AGENDA_CONTACTS.map(c => c.name);

      // STF Ministers & Judiciary
      expect(names).toContain('Alexandre de Moraes');
      expect(names).toContain('Dias Toffoli');
      expect(names).toContain('Kassio Nunes Marques');
      expect(names).toContain('Ricardo Lewandowski');
      expect(names).toContain('Benedito Gonçalves');

      // Governors & Executive
      expect(names).toContain('Ibaneis Rocha');
      expect(names).toContain('Cláudio Castro');
      expect(names).toContain('José Dirceu');
      expect(names).toContain('Guido Mantega');
      expect(names).toContain('João Doria');
      expect(names).toContain('Fábio Faria');

      // Congress
      expect(names).toContain('Davi Alcolumbre');
      expect(names).toContain('Hugo Motta');
      expect(names).toContain('Ciro Nogueira');
      expect(names).toContain('Irajá Abreu');
      expect(names).toContain('Eduardo Braga');
      expect(names).toContain('Carlos Viana');

      // Business & Market
      expect(names).toContain('Joesley Batista');
      expect(names).toContain('Wesley Batista');
      expect(names).toContain('Gabriel Galípolo');
      expect(names).toContain('André Esteves');
      expect(names).toContain('Luciano Huck');

      // Legal & Lawyers
      expect(names).toContain('Antônio Carlos de Almeida Castro (Kakay)');
      expect(names).toContain('Roberto Podval');
      expect(names).toContain('Pierpaolo Cruz Bottini (Pier)');
      expect(names).toContain('Henrique Lewandowski');
      expect(names).toContain('Viviane Barci de Moraes (Vivi Moraes)');
    });

    it('each contact has required metadata and documentation source', () => {
      for (const c of AGENDA_CONTACTS) {
        expect(c.id).toBeDefined();
        expect(c.name).toBeDefined();
        expect(c.role).toBeDefined();
        expect(c.category).toBeDefined();
        expect(c.source).toBeDefined();
        expect(c.source.length).toBeGreaterThan(0);
        expect(typeof c.hasConversation).toBe('boolean');
        if (c.hasConversation) {
          expect(c.conversationId).toBeDefined();
        }
      }
    });

    it('has categories matching defined list', () => {
      const categoriesInContacts = new Set(AGENDA_CONTACTS.map(c => c.category));
      for (const cat of categoriesInContacts) {
        expect(AGENDA_CATEGORIES).toContain(cat);
      }
    });
  });

  describe('HashRouter agenda route', () => {
    it('parses #/agenda and #/agenda/:id correctly', () => {
      expect(HashRouter.parseHash('#/agenda')).toEqual({
        route: 'agenda',
        param: null,
        messageId: null,
      });

      expect(HashRouter.parseHash('#/agenda/ibaneis-rocha')).toEqual({
        route: 'agenda',
        param: 'ibaneis-rocha',
        messageId: null,
      });
    });

    it('navigates to agenda route', () => {
      const router = new HashRouter();
      router.navigate('agenda');
      expect(window.location.hash).toBe('#/agenda');

      router.navigate('agenda', 'joesley-batista');
      expect(window.location.hash).toBe('#/agenda/joesley-batista');

      router.stop();
    });
  });
});
