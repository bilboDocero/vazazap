import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Never load production credentials into automated tests.
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const path = resolve('.env');
  if (existsSync(path)) {
    for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}
