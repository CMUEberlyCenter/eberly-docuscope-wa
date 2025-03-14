import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Prompt } from '../model/prompt';
import { PROMPT_TEMPLATES_PATH } from '../settings';

const PROMPTS = new Map<string, Prompt>();

const keyFromFilename = (path: string) => basename(path, '.md');

export async function initPrompts() {
  // update on file changes.
  const prompts = watch(PROMPT_TEMPLATES_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.md'), // only watch md files
    persistent: true,
  });
  console.log(`Prompts location: ${PROMPT_TEMPLATES_PATH}`);
  prompts.on('unlink', (path) => PROMPTS.delete(keyFromFilename(path)));
  prompts.on('add', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    PROMPTS.set(keyFromFilename(path), { prompt, temperature: 0.0 });
    console.log(`Adding prompt "${keyFromFilename(path)}"`);
  });
  prompts.on('change', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    const key = keyFromFilename(path);
    const prev = PROMPTS.get(key);
    PROMPTS.set(key, { ...prev, prompt });
    console.log(`Updating prompt "${key}"`);
  });
  return () => prompts.close();
}

export async function findPromptById(id: string) {
  return PROMPTS.get(id);
}
