import type { PageContextServer } from 'vike/types';
import { findWritingTaskById } from '../../src/server/data/mongo';
import { isInstructor } from '../../src/server/model/lti';

export async function data(pageContext: PageContextServer) {
  const taskId = pageContext.writing_task_id; // set if system specified
  const task = taskId ? await findWritingTaskById(taskId) : undefined;
  const ltiActivityTitle = pageContext.token?.platformContext?.resource?.title;
  const username = pageContext.token?.userInfo?.name;

  return {
    task,
    taskId,
    ltiActivityTitle,
    username,
    isLTI: !!pageContext.token,
    isInstructor: isInstructor(pageContext.token?.platformContext),
    // course: pageContext.token?.platformContext.context.title,
    // instructor: pageContext.token?.platformContext.resource,
    // userInfo: pageContext.token?.userInfo,
    // resource: pageContext.token?.platformContext.resource.title,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
