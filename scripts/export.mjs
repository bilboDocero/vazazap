/**
 * Write the clean export: one Markdown and one JSON per conversation, one of
 * each with everything, and a zip of the lot — into public/export/.
 *
 * Runs after split_data.py, because the list of conversations and their ids
 * come from public/data/conversations.json rather than being derived again
 * here. Messages come from the sources in data/, not from the day chunks, so a
 * file holds a whole conversation at once.
 *
 * Node rather than Python because the contact profiles live in
 * src/lib/profile-content.js. Importing them keeps the export and the site
 * saying the same thing — a profile edited in one place is edited in both.
 */

import { writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import JSZip from 'jszip';

import { getContactProfile, VORCARO_PROFILE, SOURCES } from '../src/lib/profile-content.js';
import { SETTINGS_CONTENT } from '../src/lib/settings-content.js';
import {
  ROOT, SITE, REPO, TIMEZONE, UTC_OFFSET,
  loadEntries, loadMessages, sourceOf, contactOf, whoIs, createResolver, createLocator, isPaged,
  urlsIn, linksToMarkdown, longDate, phonePretty, MEDIA,
  archiveDate, archiveTime, archivePeriod, messageDateKey, messageMonthKey, publicSourceFor,
} from './lib/corpus.mjs';

const targetArg = process.argv[2];
const OUT = targetArg
  ? (isAbsolute(targetArg) ? targetArg : join(ROOT, targetArg))
  : join(ROOT, 'dist/export');
const FORMAT_VERSION = 1;
const generatedAt = new Date().toISOString();

const entries = loadEntries();
// Highlights point at messages; resolved once here, for every file below.
const resolve = createResolver(entries);
const hrefFor = createLocator(entries);
const monthName = (ym) => archiveDate(ym, true);
const md = (text, context) => linksToMarkdown(text, { resolve, context, hrefFor });

// ── text helpers ───────────────────────────────────────────────────────────



/** One message as it reads without the app. */
function messageBody(msg) {
  const text = (msg.content || '').trim();
  switch (msg.type) {
    case 'text':
      return text;
    case 'document':
      return `_[Documento${msg.attachment ? `: ${msg.attachment}` : ''}]_${text ? `\n${text}` : ''}`;
    case 'image':
      // A view-once image whose content the forensics could not recover keeps
      // the placeholder text the source gave it.
      if (text.startsWith('[')) return `_${text}_`;
      return `_[Foto]_${text ? `\n${text}` : ''}`;
    case 'video': case 'audio': case 'sticker':
      return `_[${MEDIA[msg.type]}]_${text ? `\n${text}` : ''}`;
    case 'call':
      return `_[${text || 'Chamada'}]_`;
    case 'deleted':
      return `_[${text || 'Mensagem apagada'}]_`;
    case 'system':
      return `_(${text})_`;
    default:
      return text;
  }
}

/** A leading #, > or - would turn a line of chat into markup. */
const escapeLine = (line) => line.replace(/^([#>\-+*]|\d+\.)(?=\s|$)/, '\\$1');

// ── profile ────────────────────────────────────────────────────────────────

function profileMarkdown(title, profile, context) {
  if (!profile) return { text: '', urls: [] };
  const urls = [];
  const out = [`## ${title}`, ''];
  for (const section of profile.sections || []) {
    const who = title.replace(/^Quem é /, '');
    if (section.title && section.title !== who && section.title !== `Sobre ${who}`) {
      out.push(`### ${section.title}`, '');
    }
    for (const p of section.paragraphs || []) {
      urls.push(...urlsIn(p.text));
      out.push(md(p.text, context), '');
    }
  }
  return { text: out.join('\n'), urls };
}

function profileJson(profile, context) {
  if (!profile) return null;
  const urls = [];
  const sections = (profile.sections || []).map(s => ({
    title: s.title || null,
    paragraphs: (s.paragraphs || []).map(p => {
      urls.push(...urlsIn(p.text));
      return md(p.text, context);
    }),
  }));
  return { about: profile.about || null, sections, sources: [...new Set(urls)] };
}

// ── one conversation ───────────────────────────────────────────────────────

function conversationMarkdown(entry, messages, { standalone = true, month = null } = {}) {
  const contact = contactOf(entry);
  const source = sourceOf(entry);
  const profile = getContactProfile(entry.id);
  const heading = standalone ? '#' : '##';
  const sub = standalone ? '##' : '###';
  const out = [];

  out.push(`${heading} Daniel Vorcaro ↔ ${contact}${month ? ` — ${monthName(month)}` : ''}`, '');
  if (standalone) {
    out.push(`> Exportado de [vorcarozap](${SITE}/#/chat/${entry.id}) em ${generatedAt.slice(0, 10)}.${month ? ` Só ${monthName(month)} (${messages.length} mensagens); a conversa inteira está em vorcarozap-${entry.id}.md.` : ''} Código e dados: ${REPO}.`, '');
  }

  out.push(`${sub} Proveniência`, '', '| | |', '|---|---|');
  out.push(`| Fonte | ${source.label} |`);
  if (source.document) out.push(`| Documento | \`${source.document}\`${source.document_pages ? `, ${source.document_pages} páginas` : ''}${source.document_url ? ` — [no repositório](${source.document_url})` : ''} (sha256 \`${source.document_sha256 || 'n/d'}\`) |`);
  out.push(`| Como chegou ao público | ${source.how} |`);
  out.push(`| Período | ${month ? archivePeriod({ start: messageDateKey(messages[0]), end: messageDateKey(messages.at(-1)) }) : archivePeriod(entry.date_range)} |`);
  out.push(`| Mensagens | ${month ? `${messages.length} (de ${entry.total_messages} na conversa)` : entry.total_messages} |`);
  if (entry.saved_as) out.push(`| Contato salvo como | ${entry.saved_as} |`);
  if (entry.phone) out.push(`| Telefone | ${phonePretty(entry.phone)} |`);
  out.push(`| Fuso dos horários | ${TIMEZONE} (UTC${UTC_OFFSET}) |`);
  if (entry.note) out.push(`| Observação | ${entry.note} |`);
  out.push('');
  if (source.kind === 'public-excerpts') {
    out.push(entry.context || '', '', 'Seleção parcial; há mensagens omitidas entre os recortes.', '');
    for (const limitation of entry.limitations || []) out.push(`- ${limitation}`);
    for (const ref of entry.sources || []) out.push(`- Fonte: [${ref.publisher}](${ref.url}) — ${ref.published_at || ref.document_date || 'data de publicação não informada'}`);
    out.push('');
  }

  const who = whoIs(entry, profile);
  const { text: profileText, urls } = profileMarkdown(`Quem é ${who}`, profile, entry.id);
  if (profileText) out.push(profileText.replace(/^## /, `${sub} `).replace(/\n### /g, `\n${standalone ? '###' : '####'} `));

  out.push(`${sub} Conversa`, '');
  let day = null;
  for (const msg of messages) {
    if (messageDateKey(msg) !== day) {
      day = messageDateKey(msg);
      out.push(`${standalone ? '###' : '####'} ${longDate(day)}`, '');
    }
    // Time to the second and the message id: the key a citation needs.
    const tags = [msg.date && msg.time ? `${msg.date} ${msg.time}` : `${archiveDate(messageDateKey(msg))} ${archiveTime(msg.time)}`, `msg ${msg.id}`];
    if (msg.excerpt) tags.push('recorte publicado');
    if (msg.date_basis) tags.push('data deduzida da sequência descrita na fonte');
    if (msg.is_edited) tags.push('editada');
    if (msg.view_once) tags.push('visualização única');
    if (msg.source_page) tags.push(`laudo p. ${msg.source_page}${msg.source_figure ? `, fig. ${msg.source_figure}` : ''}`);
    out.push(`**${msg.sender}** · ${tags.join(' · ')}`);
    const body = messageBody(msg);
    if (body) out.push(...body.split('\n').map(escapeLine));
    const ref = publicSourceFor(msg, entry);
    if (ref) out.push(`Fonte: [${ref.publisher}](${ref.url}) — ${msg.source_locator}`);
    out.push('');
  }

  const sources = [...new Set(urls)];
  if (sources.length) {
    out.push(`${sub} Fontes`, '', ...sources.map(u => `- ${u}`), '');
  }
  return out.join('\n');
}

function conversationJson(entry, messages) {
  const source = sourceOf(entry);
  return {
    export: {
      generated_at: generatedAt, format_version: FORMAT_VERSION,
      site: SITE, url: `${SITE}/#/chat/${entry.id}`, repository: REPO,
      timezone: TIMEZONE, utc_offset: UTC_OFFSET,
    },
    conversation: {
      id: entry.id,
      participants: entry.participants,
      contact: contactOf(entry),
      saved_as: entry.saved_as || null,
      phone: entry.phone || null,
      date_range: entry.date_range,
      total_messages: entry.total_messages,
      media_counts: entry.media_counts,
      source: source.label,
      source_detail: source,
      note: entry.note || null,
      ...(entry.coverage ? { coverage: entry.coverage, sources: entry.sources, context: entry.context, limitations: entry.limitations, date_range_complete: entry.date_range_complete } : {}),
    },
    profile: profileJson(getContactProfile(entry.id), entry.id),
    messages: messages.map(m => ({ ...m, timestamp: m.timestamp ? `${m.timestamp}${UTC_OFFSET}` : null })),
  };
}

// ── everything ─────────────────────────────────────────────────────────────

function aboutMarkdown() {
  const about = SETTINGS_CONTENT.sections.find(s => s.title === 'Sobre o Projeto');
  const out = ['## Sobre o projeto', ''];
  for (const p of about?.paragraphs || []) out.push(md(p.text), '');
  return out.join('\n');
}

function readme(conversations) {
  const total = conversations.reduce((n, c) => n + c.total_messages, 0);
  return [
    '# vorcarozap — export completo', '',
    `Gerado em ${generatedAt.slice(0, 10)} a partir de ${SITE}. ${conversations.length} conversas, ${total} mensagens.`, '',
    '## O que tem aqui', '',
    '| Arquivo | Conteúdo |', '|---|---|',
    '| `vorcarozap-<conversa>.md` | Uma conversa legível: proveniência, quem é o contato (com fontes) e as mensagens, dia a dia |',
    '| `vorcarozap-<conversa>.json` | A mesma conversa como dados: metadados, perfil e todas as mensagens com os campos originais |',
    '| `vorcarozap.md` / `vorcarozap.json` | Tudo num arquivo só |', '',
    '## Como ler', '',
    `- Horários em ${TIMEZONE} (UTC${UTC_OFFSET}); no JSON, cada \`timestamp\` já carrega o fuso.`,
    '- Nos recortes publicados, datas parciais e horários desconhecidos são preservados; timestamp nulo não representa meia-noite. Há lacunas entre os recortes e uma fonte por registro.',
    '- Mensagens do relatório da PF trazem `laudo p. N, fig. M` — página e figura do PDF de origem, para conferência.',
    '- `_[Foto]_`, `_[Vídeo]_`, `_[Áudio]_`, `_[Documento]_`: a mídia não faz parte do material público; só o tipo é conhecido.',
    '- `[imagem de visualização única — conteúdo não recuperado]`: enviada em visualização única e não recuperada pela perícia.', '',
    aboutMarkdown(),
    '## Fontes gerais', '', ...SOURCES.map(s => `- [${s.label}](${s.url})`), '',
    `## Aviso`, '',
    'As informações aqui compiladas são de domínio público, extraídas de reportagens jornalísticas e de documentos cujo sigilo foi levantado judicialmente. Este projeto não tem vinculação com nenhuma das partes envolvidas.', '',
  ].join('\n');
}

function allMarkdown(built) {
  const total = built.reduce((n, b) => n + b.entry.total_messages, 0);
  const out = [
    '# vorcarozap — todas as conversas', '',
    `> Exportado de [vorcarozap](${SITE}) em ${generatedAt.slice(0, 10)}. ${built.length} conversas, ${total} mensagens. Código e dados: ${REPO}.`, '',
    aboutMarkdown(),
    // Vorcaro's own profile quotes the Martha chat when it says "search".
    profileMarkdown('Quem é Daniel Vorcaro', VORCARO_PROFILE, 'martha-graeff').text,
    '## Conversas', '',
    ...built.map(b => `- [${contactOf(b.entry)}](#${b.entry.id}) — ${b.entry.total_messages} mensagens, ${archivePeriod(b.entry.date_range)}`),
    '', '---', '',
  ];
  for (const b of built) {
    out.push(`<a id="${b.entry.id}"></a>`, '');
    out.push(conversationMarkdown(b.entry, b.messages, { standalone: false }), '---', '');
  }
  return out.join('\n');
}

// ── run ────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true });
for (const stale of readdirSync(OUT)) {
  if (/^vorcarozap/.test(stale)) writeFileSync(join(OUT, stale), '');
}

const zip = new JSZip();
const built = [];

for (const entry of entries) {
  const messages = loadMessages(entry);
  if (messages.length !== entry.total_messages) {
    console.error(`${entry.id}: ${messages.length} messages in source, ${entry.total_messages} in conversations.json`);
    process.exit(1);
  }
  const mdText = conversationMarkdown(entry, messages);
  const jsonText = JSON.stringify(conversationJson(entry, messages), null, 1);
  writeFileSync(join(OUT, `vorcarozap-${entry.id}.md`), mdText);
  writeFileSync(join(OUT, `vorcarozap-${entry.id}.json`), jsonText);
  zip.file(`vorcarozap-${entry.id}.md`, mdText);
  zip.file(`vorcarozap-${entry.id}.json`, jsonText);
  built.push({ entry, messages });
  console.log(`${entry.id}: ${messages.length} messages, ${(mdText.length / 1024).toFixed(0)} kB md`);

  // A conversation too big for one page also comes one month at a time, so a
  // reader after a single exchange does not have to take all of it.
  if (isPaged(entry)) {
    const months = new Map();
    for (const m of messages) { const ym = messageMonthKey(m); if (!months.has(ym)) months.set(ym, []); months.get(ym).push(m); }
    for (const [ym, msgs] of months) {
      const monthMd = conversationMarkdown(entry, msgs, { month: ym });
      const monthJson = JSON.stringify({ ...conversationJson(entry, msgs), month: ym }, null, 1);
      writeFileSync(join(OUT, `vorcarozap-${entry.id}-${ym}.md`), monthMd);
      writeFileSync(join(OUT, `vorcarozap-${entry.id}-${ym}.json`), monthJson);
      zip.file(`meses/vorcarozap-${entry.id}-${ym}.md`, monthMd);
    }
    console.log(`${entry.id}: ${months.size} monthly files`);
  }
}

const allMd = allMarkdown(built);
const allJson = JSON.stringify({
  export: { generated_at: generatedAt, format_version: FORMAT_VERSION, site: SITE, repository: REPO, timezone: TIMEZONE, utc_offset: UTC_OFFSET },
  conversations: built.map(b => conversationJson(b.entry, b.messages)),
});
writeFileSync(join(OUT, 'vorcarozap.md'), allMd);
writeFileSync(join(OUT, 'vorcarozap.json'), allJson);
zip.file('README.md', readme(entries));

const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
writeFileSync(join(OUT, 'vorcarozap-export.zip'), zipBuf);

console.log(`\nDone! ${built.length} conversations → ${OUT}`);
console.log(`vorcarozap.md ${(allMd.length / 1048576).toFixed(1)} MB, vorcarozap.json ${(allJson.length / 1048576).toFixed(1)} MB, zip ${(zipBuf.length / 1048576).toFixed(1)} MB`);
