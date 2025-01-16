import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { isWritingTask, WritingTask } from '../../lib/WritingTask';
import { WRITING_TASKS_PATH } from '../settings';

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
      console.error(err);
    }
  });
  wtds.on('add', async (path) => {
    try {
      const content = await readFile(path, { encoding: 'utf8' });
      const json = JSON.parse(content);
      if (!isWritingTask(json)) {
        throw new Error(`${path} is not a Writing Task Description.`);
      }
      await add(path, json);
    } catch (err) {
      console.error(err);
    }
  });
  wtds.on('change', async (path) => {
    try {
      const content = await readFile(path, { encoding: 'utf8' });
      const json = JSON.parse(content);
      if (!isWritingTask(json)) {
        throw new Error(`${path} is not a WTD`);
      }
      await add(path, json);
    } catch (err) {
      console.error(err);
    }
  });

  return () => wtds.close();
}
