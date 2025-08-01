import type { PageContextServer } from 'vike/types';
import { findWritingTaskById } from '../../../src/server/data/mongo';

export const data = async (pageContext: PageContextServer) => {
  const taskId = pageContext.routeParams.id;
  const task = await findWritingTaskById(taskId);

  return {
    task,
    taskId,
    course: pageContext.token?.platformContext.context.title,
    // instructor: pageContext.token?.platformContext.resource,
    userInfo: pageContext.token?.userInfo,
    resource: pageContext.token?.platformContext.resource.title,
  };
};

export type Data = Awaited<ReturnType<typeof data>>;
