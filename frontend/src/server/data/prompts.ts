import { Prompt } from '../model/prompt';
import chokidar from 'chokidar';
import { PROMPT_TEMPLATES_PATH } from '../settings';
import { glob, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const PROMPTS = new Map<string, Prompt>();

const keyFromFilename = (path: string) => basename(path, '.md');

export async function initPrompts() {
  // initialize by reading from filesystem.
  for await (const entry of glob(`${PROMPT_TEMPLATES_PATH}/*.md`)) {
    const prompt = await readFile(entry, { encoding: 'utf8' });
    PROMPTS.set(keyFromFilename(entry), { prompt, temperature: 0.0 }); // role
  }
  // update on file changes.
  const watch = chokidar.watch(PROMPT_TEMPLATES_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.md'), // only watch js files
    persistent: true,
  });
  watch.on('unlink', (path) => PROMPTS.delete(keyFromFilename(path)));
  watch.on('add', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    PROMPTS.set(keyFromFilename(path), { prompt, temperature: 0.0 });
  });
  watch.on('change', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    const key = keyFromFilename(path);
    const prev = PROMPTS.get(key);
    PROMPTS.set(key, { ...prev, prompt });
  });
  return () => watch.close();
}
export async function findPrompt(id: string) {
  if (PROMPTS.has(id)) {
    return PROMPTS.get(id);
  }
}
