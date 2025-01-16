import { watch } from 'chokidar';
import { readFile } from 'node:fs/promises';
import { isWritingTask } from '../../lib/WritingTask';
import { WRITING_TASKS_PATH } from '../settings';
import { deleteWritingTaskByPath, upsertPublicWritingTask } from './mongo';

export async function initWritingTasks() {
  const wtds = watch(WRITING_TASKS_PATH, {
    ignored: (path, stats) => !!stats?.isFile() && !path.endsWith('.json'),
    persistent: true,
  });
  wtds.on('unlink', async (path) => {
    try {
      await deleteWritingTaskByPath(path);
    } catch (err) {
      console.error(err);
    }
  });
  wtds.on('add', async (path) => {
    try {
      const content = await readFile(path, { encoding: 'utf8' });
      const json = JSON.parse(content);
      if (!isWritingTask(json)) {
        throw new Error(`${path} is not a WTD`);
      }
      await upsertPublicWritingTask(path, json);
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
      await upsertPublicWritingTask(path, json);
    } catch (err) {
      console.error(err);
    }
  });

  return () => wtds.close();
}
