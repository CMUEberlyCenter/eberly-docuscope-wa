import {
  findAllPreviewsBasic,
  findAllPublicWritingTasks,
} from '../../../../src/server/data/mongo';

/** Populates the data required for the admin genlink page. */
export const data = async () => {
  // Fetch all public writing tasks and basic preview information from the database
  const tasks = await findAllPublicWritingTasks();
  const previews = (await findAllPreviewsBasic()).map((preview, i) => ({
    ...preview,
    _id: undefined,
    id: preview._id?.toString() ?? `preview_${i}`,
  }));
  return { tasks, previews };
};

export type Data = Awaited<ReturnType<typeof data>>;
