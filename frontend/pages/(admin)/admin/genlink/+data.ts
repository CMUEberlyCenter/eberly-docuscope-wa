import {
  findAllPublicWritingTasks,
  findAllSnapshotsBasic,
} from '#/server/data/mongo';

/** Populates the data required for the admin genlink page. */
export const data = async () => {
  // Fetch all public writing tasks and basic preview information from the database
  const tasks = await findAllPublicWritingTasks();
  const snapshots = await findAllSnapshotsBasic();
  return { tasks, snapshots };
};

export type Data = Awaited<ReturnType<typeof data>>;
