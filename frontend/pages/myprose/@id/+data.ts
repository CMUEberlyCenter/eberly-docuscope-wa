import { findWritingTaskById } from '#server/data/mongo';
import { render } from 'vike/abort';
import type { PageContextServer } from 'vike/types';

export const data = async (pageContext: PageContextServer) => {
  const taskId = pageContext.routeParams.id;
  const { username, email, name } = pageContext.auth?.user ?? {};

  try {
    const task = await findWritingTaskById(taskId);
    return {
      task,
      taskId,
      user: {
        username: username ?? undefined,
        email,
        name,
      },
    };
  } catch (err) {
    if (err instanceof ReferenceError)
      throw render(404, `No writing task with id ${taskId}`);
    throw err;
  }
};

export type Data = Awaited<ReturnType<typeof data>>;
