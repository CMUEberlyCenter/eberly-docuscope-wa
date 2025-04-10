import { findAllPublicWritingTasks } from '../../src/server/data/mongo';

async function data() {
  const tasks = await findAllPublicWritingTasks();
  return { tasks };
}

export { data };
