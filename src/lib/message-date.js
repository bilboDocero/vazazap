/** Routing keys preserve date precision without inventing a calendar day. */
export const messageDateKey = message => message.date || message.reported_date || 'undated';
export const messageMonthKey = message => messageDateKey(message).slice(0, 7);

export function archiveDate(value, long = false) {
  if (!value || value === 'undated') return 'Data não informada';
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) {
    if (!long) return `${value.slice(5)}/${value.slice(0, 4)}`;
    return new Date(`${value}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Data não informada';
  const [year, month, day] = value.split('-');
  return long
    ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : `${day}/${month}/${year}`;
}

export const archiveTime = time => time ? time.slice(0, 5) : 'Horário não informado';
export const archivePeriod = range => range?.start && range?.end
  ? `${archiveDate(range.start)} a ${archiveDate(range.end)}` : 'Período não determinado';

export const publicSourceFor = (message, conversation) => conversation?.sources?.find(source => source.id === message.source_id);

/** Preserve the quotation while making its editorial context searchable. */
export const messageSearchText = message => [message.content, message.editorial_context].filter(Boolean).map(text => text.trim()).filter(Boolean).join('\n');
export const publicMessageLabel = message => message.content_format === 'editorial_summary'
  ? 'Resumo editorial' : message.content_format === 'excerpt_with_context' ? 'Trecho e contexto editorial' : 'Recorte publicado';
export const dateBasisLabel = message => message.date_basis === 'year_context_in_report'
  ? 'Ano contextualizado no episódio descrito na fonte' : 'Data deduzida da sequência descrita na fonte';
