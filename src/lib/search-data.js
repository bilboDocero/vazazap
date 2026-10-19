import { SearchEngine } from './search-engine.js';

/** The manifest is revalidated; its content-addressed data file is cacheable. */
export async function loadSearchEngine(basePath = '/data') {
  const base = basePath.replace(/\/$/, '');
  const manifestResponse = await fetch(`${base}/search-manifest.json`, { cache: 'no-cache' });
  if (!manifestResponse.ok) throw new Error(`Search manifest: HTTP ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  if (manifest.version !== 1 || !/^search-index\.[a-f0-9]{16}\.json$/.test(manifest.file || '')) throw new Error('Invalid search manifest');
  const response = await fetch(`${base}/${manifest.file}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Search index: HTTP ${response.status}`);
  return new SearchEngine(await response.json()).prepare();
}
