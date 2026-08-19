import { findWritingTaskById } from '#server/data/mongo';
import { render } from 'vike/abort';
import type { PageContextServer } from 'vike/types';

export const data = async (pageContext: PageContextServer) => {
  const taskId = pageContext.routeParams.id;
  const token = pageContext.session?.token; // as this is in the myprose route (non-LTI), this should be null.
  try {
    const task = await findWritingTaskById(taskId);
    return {
      task,
      taskId,
      course: token?.platformContext.context.title,
      // instructor: token?.platformContext.resource,
      userInfo: token?.userInfo,
      resource: token?.platformContext.resource.title,
    };
  } catch (err) {
    if (err instanceof ReferenceError)
      throw render(404, `No writing task with id ${taskId}`);
    throw err;
  }
};

export type Data = Awaited<ReturnType<typeof data>>;
