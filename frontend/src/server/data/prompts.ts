import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { Prompt } from '../model/prompt';
import { PROMPT_TEMPLATES_PATH } from '../settings';

const PROMPTS = new Map<string, Prompt>();

const keyFromFilename = (path: string) => basename(path, '.md');

export async function initPrompts() {
  // initialize by reading from filesystem. Unnecessary as watch handles it.
  //   for await (const entry of glob(`${PROMPT_TEMPLATES_PATH}/*.md`)) {
  //     console.log('initial', entry)
  //     const prompt = await readFile(entry, { encoding: 'utf8' });
  //     PROMPTS.set(keyFromFilename(entry), { prompt, temperature: 0.0 }); // role
  //   }
  // update on file changes.
  const prompts = watch(PROMPT_TEMPLATES_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.md'), // only watch md files
    persistent: true,
  });
  prompts.on('unlink', (path) => PROMPTS.delete(keyFromFilename(path)));
  prompts.on('add', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    PROMPTS.set(keyFromFilename(path), { prompt, temperature: 0.0 });
  });
  prompts.on('change', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    const key = keyFromFilename(path);
    const prev = PROMPTS.get(key);
    PROMPTS.set(key, { ...prev, prompt });
  });
  return () => prompts.close();
}

export async function findPromptById(id: string) {
  return PROMPTS.get(id);
}
