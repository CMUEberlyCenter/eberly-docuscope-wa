import { PageContextServer } from "vike/types";
import { findWritingTaskById } from "../../src/server/data/mongo";

export async function data(pageContext: PageContextServer) {
  const taskId = pageContext.writing_task_id; // set if system specified
  const task = taskId ? await findWritingTaskById(taskId) : undefined;

  return {
    task,
    taskId,
    course: pageContext.token?.platformContext.context.title,
    // instructor: pageContext.token?.platformContext.resource,
    userInfo: pageContext.token?.userInfo,
    resource: pageContext.token?.platformContext.resource.title,
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
