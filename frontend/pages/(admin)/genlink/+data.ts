// import { DataAsync } from 'vike/types';
import { findAllPublicWritingTasks } from '../../../src/server/data/mongo';

export const data = async () => {
  const tasks = await findAllPublicWritingTasks();
  return { tasks };
}

export type Data = Awaited<ReturnType<typeof data>>;
