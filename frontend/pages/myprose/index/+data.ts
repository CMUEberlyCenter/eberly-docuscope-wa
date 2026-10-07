import { findAllPublicWritingTasks } from '#/server/data/mongo.ts';

export const data = async () => {
  const tasks = await findAllPublicWritingTasks();
  return { tasks };
};

export type Data = Awaited<ReturnType<typeof data>>;
