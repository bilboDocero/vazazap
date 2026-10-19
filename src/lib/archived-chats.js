/**
 * Archived Chats module — WhatsApp-like archived conversations feature.
 * Contains the 5 most relevant leaked chats in the Daniel Vorcaro / Banco Master case.
 */

export const DEFAULT_ARCHIVED_IDS = [
  'alexandre-de-moraes',
  'martha-graeff',
  'fabio-faria',
  'ciro-daniel-fabio-hugo',
  'diretor-paulo-sergio-bacen',
];

export const ARCHIVED_CONVERSATIONS = new Set(DEFAULT_ARCHIVED_IDS);

const STORAGE_KEY = 'vorcarozap:archived_conversations';

/**
 * Load the set of archived conversation IDs (falls back to the 5 most relevant).
 * @returns {Set<string>}
 */
export function getArchivedSet() {
  if (typeof window === 'undefined') return new Set(DEFAULT_ARCHIVED_IDS);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed);
      }
    }
  } catch {}
  return new Set(DEFAULT_ARCHIVED_IDS);
}

/**
 * Save the set of archived conversation IDs to localStorage.
 * @param {Set<string>|Array<string>} set
 */
export function saveArchivedSet(set) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(set);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Check if a conversation is archived.
 * @param {string} id
 * @param {Set<string>} [customSet]
 * @returns {boolean}
 */
export function isArchived(id, customSet) {
  const set = customSet || getArchivedSet();
  return set.has(id);
}

/**
 * Toggle archived state for a conversation.
 * @param {string} id
 * @returns {{ isArchived: boolean, set: Set<string> }}
 */
export function toggleArchived(id) {
  const set = getArchivedSet();
  const currentlyArchived = set.has(id);
  if (currentlyArchived) {
    set.delete(id);
  } else {
    set.add(id);
  }
  saveArchivedSet(set);
  return { isArchived: !currentlyArchived, set };
}
