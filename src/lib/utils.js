import { archiveDate, archiveTime } from './message-date.js';

/**
 * Utility functions for vorcarozap.
 */

/**
 * Slugify a name for use as URL/ID.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format a date string as pt-BR long date.
 * e.g. "2024-02-10" → "10 de fevereiro de 2024"
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatDateLong(dateStr) {
  return archiveDate(dateStr, true);
}

/**
 * Format a date string as DD/MM/YYYY (Brazilian format).
 * e.g. "2024-02-10" → "10/02/2024"
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {string}
 */
export function formatDateShort(dateStr) {
  return archiveDate(dateStr);
}

/**
 * Format time from HH:MM:SS or timestamp to HH:MM.
 * @param {string} time - Time string (HH:MM:SS or HH:MM)
 * @returns {string}
 */
export function formatTime(time) {
  return archiveTime(time);
}

/**
 * Linkify URLs in text content.
 * @param {string} text
 * @returns {string} HTML string with <a> tags
 */
export function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Classify a message type for rendering.
 * @param {object} msg
 * @returns {string} One of: text, image, video, audio, sticker, document, deleted, call, system
 */
export function classifyMessage(msg) {
  return msg.type || 'text';
}

/**
 * Truncate a string to maxLen, adding ellipsis if needed.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 80) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen) + '…';
}

/**
 * Format a number with locale separators (pt-BR).
 * e.g. 65772 → "65.772"
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  return n.toLocaleString('pt-BR');
}

/**
 * Format a relative date label for chat list timestamps.
 * Returns "Hoje", "Ontem", or the formatted short date.
 * @param {string} dateStr - ISO date (YYYY-MM-DD)
 * @returns {string}
 */
export function formatRelativeDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return archiveDate(dateStr);
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - date) / 86400000);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Escape an attribute value to prevent attribute breakout / injection.
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate and sanitize URLs to prevent javascript: and dangerous schemas.
 * @param {string} url
 * @param {boolean} allowDataImage - whether to allow data:image/ safe URLs
 * @returns {string} safe URL or '#' / ''
 */
export function sanitizeUrl(url, allowDataImage = false) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Allow safe web protocols
  if (/^https?:\/\//i.test(trimmed) || /^\/(?!\/)/.test(trimmed)) {
    return escapeAttr(trimmed);
  }

  // Allow data:image URLs if explicitly requested (e.g. for user photos)
  if (allowDataImage && /^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
    return escapeAttr(trimmed);
  }

  return '#';
}

/**
 * Processes and resizes an uploaded avatar image using the HTML Canvas API.
 * Center-crops to a 1:1 square and scales to targetSize (default 256x256),
 * compressing output to reduce database payload and network bandwidth.
 * @param {File|Blob} file
 * @param {number} [targetSize=256]
 * @param {number} [quality=0.85]
 * @returns {Promise<string>} Base64 Data URL
 */
export function processAvatarImage(file, targetSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nenhum arquivo fornecido'));

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem'));
    reader.onload = () => {
      const img = new Image();
      let finished = false;

      const finishWith = (dataUrl) => {
        if (finished) return;
        finished = true;
        resolve(dataUrl);
      };

      img.onerror = () => finishWith(reader.result);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return finishWith(reader.result);
          }

          const minDim = Math.min(img.width || targetSize, img.height || targetSize);
          const sx = ((img.width || minDim) - minDim) / 2;
          const sy = ((img.height || minDim) - minDim) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          finishWith(dataUrl);
        } catch {
          finishWith(reader.result);
        }
      };

      // In JSDOM or headless environments without full layout/image decoding, fallback safely
      setTimeout(() => {
        if (!finished) finishWith(reader.result);
      }, 150);

      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Put text on the clipboard, the modern way or the old one.
 * @returns {Promise<boolean>} whether it took
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
