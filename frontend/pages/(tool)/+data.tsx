import { PageContextServer } from "vike/types";
import { findWritingTaskById } from "../../src/server/data/mongo";

export async function data(pageContext: PageContextServer) {
  // prefer writing_task_id from LTI token
  // if not present, use writing_task_id param from URL
  const taskId = pageContext.writing_task_id
  const task = taskId ? await findWritingTaskById(taskId) : null;
  // console.log('token', pageContext.token);
  console.log(task);

  return { task,
    course: pageContext.token?.platformContext.context.title,
    // instructor: pageContext.token?.platformContext.resource,
    userInfo: pageContext.token?.userInfo,
    resource: pageContext.token?.platformContext.resource.title,
   };
}
export type Data = Awaited<ReturnType<typeof data>>;
