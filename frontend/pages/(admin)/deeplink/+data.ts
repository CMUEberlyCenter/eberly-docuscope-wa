import { findAllPublicWritingTasks } from '#server/data/mongo';
import type { PageContextServer } from 'vike/types';

export const data = async (pageContext: PageContextServer) => {
  const tasks = await findAllPublicWritingTasks();
  const { search } = pageContext.urlParsed;
  // unused in deep link admin page
  // const course = pageContext.token?.platformContext.context.title;
  // const taskId = pageContext.token?.platformContext.custom?.writing_task_id;
  // console.log('course', course);
  // console.log('taskId', taskId);
  // console.log(pageContext.token);
  return { tasks, ltik: search.ltik };
};
export type Data = Awaited<ReturnType<typeof data>>;
