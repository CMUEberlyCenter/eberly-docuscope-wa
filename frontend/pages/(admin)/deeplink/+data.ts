import type { PageContextServer } from 'vike/types';
import { findAllPublicWritingTasks } from '../../../src/server/data/mongo';

export const data = async (_pageContext: PageContextServer) => {
  const tasks = await findAllPublicWritingTasks();
  // unused in deep link admin page
  // const course = pageContext.token?.platformContext.context.title;
  // const taskId = pageContext.token?.platformContext.custom?.writing_task_id;
  // console.log('course', course);
  // console.log('taskId', taskId);
  // console.log(pageContext.token);
  return { tasks };
};
export type Data = Awaited<ReturnType<typeof data>>;
