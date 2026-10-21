import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { logger } from '../logger';
import type { Prompt } from '../model/prompt';
import { PROMPT_TEMPLATES_PATH } from '../settings';

/** Extract the key from a filename. */
const keyFromFilename = (path: string) => basename(path, '.md');

/**
 * Initialize the prompts by watching the specified directory.
 * The watched directory is specified by the PROMPT_TEMPLATES_PATH setting.
 * @returns A function to stop watching for changes.
 */
export async function initPrompts(
  add: (prompt: Prompt) => Promise<unknown>,
  remove: (key: string) => Promise<unknown>
) {
  // update on file changes.
  const prompts = watch(PROMPT_TEMPLATES_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.md'), // only watch md files
    persistent: true,
  });
  logger.info(`Prompts location: ${PROMPT_TEMPLATES_PATH}`);
  prompts.on('unlink', (path) => remove(keyFromFilename(path)));
  prompts.on('add', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    const key = keyFromFilename(path);
    await add({ key, prompt, temperature: 0.0 });
    logger.info(`Adding prompt "${key}"`);
  });
  prompts.on('change', async (path) => {
    const prompt = await readFile(path, { encoding: 'utf8' });
    const key = keyFromFilename(path);
    await add({ key, prompt, temperature: 0.0 });
    logger.info(`Updating prompt "${key}"`);
  });
  return () => prompts.close();
}
