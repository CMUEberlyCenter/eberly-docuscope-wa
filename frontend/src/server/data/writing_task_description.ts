import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import {
  isWritingTask,
  isWritingTaskIdValid,
  type WritingTask,
} from '../../lib/WritingTask';
import { logger } from '../logger';
import { WRITING_TASKS_PATH } from '../settings';

/**
 * Initialize the writing tasks by watching the specified directory.
 * The watched directory is specified by the WRITING_TASKS_PATH setting.
 * @param add A function to call when a new writing task is added.
 * @param remove A function to call when a writing task is removed.
 * @returns A function to stop watching for changes.
 */
export async function initWritingTasks(
  add: (path: string, task: WritingTask) => Promise<unknown>,
  remove: (path: string) => Promise<unknown>
) {
  const wtds = watch(WRITING_TASKS_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.json'),
    persistent: true,
  });
  wtds.on('unlink', async (path) => {
    try {
      await remove(path);
    } catch (err) {
      logger.error(err);
    }
  });
  wtds.on('add', async (path) => {
    try {
      const content = await readFile(path, { encoding: 'utf8' });
      const json = JSON.parse(content);
      if (!isWritingTask(json)) {
        throw new Error(`${path} is not a Writing Task Description.`);
      }
      if (!isWritingTaskIdValid(json.info.id)) {
        throw new Error(`${path} has an invalid info.id value.`);
      }
      await add(path, json);
    } catch (err) {
      logger.error(err);
    }
  });
  wtds.on('change', async (path) => {
    try {
      const content = await readFile(path, { encoding: 'utf8' });
      const json = JSON.parse(content);
      if (!isWritingTask(json)) {
        throw new Error(`${path} is not a Writing Task Description.`);
      }
      if (!isWritingTaskIdValid(json.info.id)) {
        throw new Error(`${path} has an invalid info.id value.`);
      }
      await add(path, json);
    } catch (err) {
      logger.error(err);
    }
  });

  return () => wtds.close();
}
