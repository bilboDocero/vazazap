import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./split_data.py', import.meta.url));
const commands = process.platform === 'win32' ? ['python', 'python3', 'py'] : ['python3', 'python'];
for (const command of commands) {
  const result = spawnSync(command, [script], { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') continue;
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
console.error('Python 3 não encontrado. Instale o Python 3 para gerar os dados.');
process.exit(1);
