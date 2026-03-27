import { findWritingTaskById } from '#server/data/mongo';
import { render } from 'vike/abort';
import type { PageContextServer } from 'vike/types';

export const data = async (pageContext: PageContextServer) => {
  const taskId = pageContext.routeParams.id;
  try {
    const task = await findWritingTaskById(taskId);
    return {
      task,
      taskId,
      course: pageContext.token?.platformContext.context.title,
      // instructor: pageContext.token?.platformContext.resource,
      userInfo: pageContext.token?.userInfo,
      resource: pageContext.token?.platformContext.resource.title,
    };
  } catch (err) {
    if (err instanceof ReferenceError)
      throw render(404, `No writing task found with id ${taskId}`);
    throw err;
  }
};

export type Data = Awaited<ReturnType<typeof data>>;
