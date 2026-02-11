import {
  findAllPrivateWritingTasks,
  findAllPublicWritingTasks,
} from '../../../../src/server/data/mongo';

export const data = async () => {
  const tasks = await findAllPublicWritingTasks();
  const privateTasks = await findAllPrivateWritingTasks();
  return {
    tasks,
    privateTasks: privateTasks.map((task) => ({
      ...task,
      _id: task._id?.toString() ?? undefined,
    })),
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
