import { findAllPreviews, findAllPublicWritingTasks } from '../../../../src/server/data/mongo';

export const data = async () => {
  const tasks = await findAllPublicWritingTasks();
  const previews = (await findAllPreviews()).map((preview, i) => ({
    ...preview,
    _id: undefined,
    id: preview._id?.toString() ?? `preview_${i}`,
  }));
  return { tasks, previews };
};

export type Data = Awaited<ReturnType<typeof data>>;
