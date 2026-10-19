/** Fetch, parse, normalize and search on the worker; never send the index back. */
import { loadSearchEngine } from './search-data.js';

let loading = null;
const cancelled = new Set();
const running = new Set();
function getEngine(basePath) {
  if (!loading) loading = loadSearchEngine(basePath).catch(error => { loading = null; throw error; });
  return loading;
}

self.onmessage = async ({ data }) => {
  const { type, id, basePath, query, options } = data;
  if (type === 'cancel') {
    if (running.has(id)) cancelled.add(id);
    return;
  }
  running.add(id);
  try {
    const engine = await getEngine(basePath);
    const result = type === 'load'
      ? { count: engine.data.messages.length }
      : await engine.search(query, options, () => cancelled.has(id));
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message, name: error.name });
  } finally {
    running.delete(id);
    cancelled.delete(id);
  }
};
