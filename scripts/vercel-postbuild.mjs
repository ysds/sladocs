// Inject ROOT_DIR into the Vercel function so it reads the bundled docs at
// runtime. waku's vercel adapter copies privateDir into the function, so the
// build command stages docs there as private/docs; the function's cwd is its
// own root, and env.ts resolves a relative ROOT_DIR against it.
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve('.vercel/output/functions/RSC.func/.vc-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

config.environment = { ...config.environment, ROOT_DIR: 'private/docs' };
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('[vercel-postbuild] set ROOT_DIR=private/docs on the function');
