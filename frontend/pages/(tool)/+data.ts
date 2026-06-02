import {
  findAllPublicWritingTasks,
  findWritingTaskById,
} from '#server/data/mongo';
import { logger } from '#server/logger.js';
import { isInstructor, startGrading } from '#server/model/lti';
import { Provider } from 'ltijs';
import type { PageContextServer } from 'vike/types';

export async function data(pageContext: PageContextServer) {
  const taskId = pageContext.writing_task_id; // set if system specified
  const tokenTask = pageContext.token?.platformContext.custom?.writing_task; // set if LTI specified and writing_task included in custom
  const task = tokenTask
    ? JSON.parse(tokenTask)
    : taskId
      ? await findWritingTaskById(taskId)
      : undefined;
  const tasks = task
    ? []
    : (await findAllPublicWritingTasks()).map(({ _id, ...task }) => task); // need everything but _id for preview.

  try {
    // Not necessarily the most appropriate place to put this, but it ensures that we attempt to grade as soon as possible when the user accesses the app with an LTI token.
    startGrading(Provider.Grade, pageContext.token).then((check) => {
      logger.info('LTI grade:', check);
    });
  } catch (error) {
    logger.error('Error during LTI grade check:', { error });
    // NOOP if grading fails, as this is not critical for the main functionality of the app, and we do not want to block users from using the app if there is an issue with grading.
  }

  return {
    task,
    taskId,
    tasks,
    ltiActivityTitle: pageContext.token?.platformContext?.resource?.title,
    username: pageContext.token?.userInfo?.name,
    isLTI: !!pageContext.token,
    isInstructor: isInstructor(pageContext.token?.platformContext),
    token: pageContext.token, // necessary for telefuncs to have access to the token for LTI grading as page context is not usable in telefuncs.
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
