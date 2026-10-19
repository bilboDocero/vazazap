/** Lazy global search: one index in the worker, only result pages cross threads. */
import { loadSearchEngine } from './search-data.js';
export { normalize, unpackSearchIndex } from './search-engine.js';

let worker = null;
let workerUnavailable = false;
let loading = null;
let fallback = null;
let currentBase = null;
let initialized = false;
let generation = 0;
let requestId = 0;
const pending = new Map();
const abortError = () => new DOMException('Search cancelled', 'AbortError');

function failWorker(error) {
  worker?.terminate();
  worker = null;
  workerUnavailable = true;
  if (initialized) { loading = null; initialized = false; }
  for (const callback of pending.values()) callback.reject(error);
  pending.clear();
}

function getWorker() {
  if (workerUnavailable || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }) => {
        const callback = pending.get(data.id);
        if (!callback) return;
        if (data.error) {
          const error = new Error(data.error);
          error.name = data.name || 'Error';
          callback.reject(error);
        } else callback.resolve(data.result);
      };
      worker.onerror = event => { event.preventDefault?.(); failWorker(new Error('Search worker failed')); };
      worker.onmessageerror = () => failWorker(new Error('Invalid search worker response'));
    } catch {
      workerUnavailable = true;
      worker = null;
    }
  }
  return worker;
}

function request(type, payload, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  const target = worker;
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    const cleanup = () => { pending.delete(id); signal?.removeEventListener('abort', cancel); };
    const cancel = () => {
      target?.postMessage({ type: 'cancel', id });
      cleanup();
      reject(abortError());
    };
    pending.set(id, {
      resolve: value => { cleanup(); resolve(value); },
      reject: error => { cleanup(); reject(error); },
    });
    signal?.addEventListener('abort', cancel, { once: true });
    try { target.postMessage({ type, id, ...payload }); }
    catch (error) { failWorker(error); }
  });
}

async function ensureLoaded(basePath) {
  if (currentBase !== null && currentBase !== basePath) resetSearchIndex();
  currentBase = basePath;
  if (!loading) {
    const epoch = generation;
    loading = (async () => {
      if (getWorker()) {
        try {
          await request('load', { basePath });
          if (epoch !== generation) throw abortError();
          initialized = true;
          return;
        }
        catch (error) { if (!workerUnavailable) throw error; }
      }
      const engine = await loadSearchEngine(basePath);
      if (epoch !== generation) throw abortError();
      fallback = engine;
      initialized = true;
    })().catch(error => { if (epoch === generation) loading = null; throw error; });
  }
  return loading;
}

export async function searchPage(query, { signal, basePath = '/data', ...options } = {}) {
  if (signal?.aborted) throw abortError();
  if (!query || query.trim().length < 2) return { results: [], nextCursor: null };
  // Resolve base-path changes before capturing this request's generation.
  if (currentBase !== null && currentBase !== basePath) resetSearchIndex();
  const epoch = generation;
  await ensureLoaded(basePath);
  if (signal?.aborted || epoch !== generation) throw abortError();
  if (worker) {
    try { return await request('search', { query, options }, signal); }
    catch (error) {
      if (!workerUnavailable || signal?.aborted || epoch !== generation) throw error;
      await ensureLoaded(basePath);
    }
  }
  return fallback.search(query, options, () => signal?.aborted || epoch !== generation);
}

/** Conversation searches share the global index; filtering happens in the worker. */
export async function searchAsync(query, options = {}) {
  return (await searchPage(query, options)).results;
}

export function resetSearchIndex() {
  generation++;
  worker?.terminate();
  worker = null;
  for (const callback of pending.values()) callback.reject(abortError());
  pending.clear();
  workerUnavailable = false;
  loading = null;
  fallback = null;
  currentBase = null;
  initialized = false;
}
