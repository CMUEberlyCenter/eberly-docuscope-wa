import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Prompt } from '../model/prompt';
import { PROMPT_TEMPLATES_PATH } from '../settings';

/** Map of prompt identifiers to their content.  Acts as an in-memory database. */
const PROMPTS = new Map<string, Prompt>();

/** Extract the key from a filename. */
const keyFromFilename = (path: string) => basename(path, '.md');

/**
 * Initialize the prompts by watching the specified directory.
 * The watched directory is specified by the PROMPT_TEMPLATES_PATH setting.
 * @returns A function to stop watching for changes.
 */
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

/**
 * Retrieve the prompt given its identifier.
 * The identifier is equivalent to the basename of the prompt file without the extension.
 * @example
 * ```ts
 * const prompt = await findPromptById('civil_tone');
 * ```
 * @param id The ID of the prompt to retrieve.
 * @returns The prompt if found, otherwise undefined.
 */
export async function findPromptById(id: string) {
  return PROMPTS.get(id);
}
