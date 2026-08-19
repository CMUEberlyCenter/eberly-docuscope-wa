import { isWritingTask, WritingTask } from '#lib/WritingTask.js';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
} from '#server/data/mongo';
import { logger } from '#server/logger.js';
import {
  isContentDeveloper,
  isInstructor,
  isStudent,
  isTestUser,
  startGrading,
} from '#server/model/lti';
import { Provider } from 'ltijs';
import type { PageContextServer } from 'vike/types';

export async function data(pageContext: PageContextServer) {
  const taskId = pageContext.writing_task_id; // set if system specified
  const token = pageContext.session?.token; // set if LTI specified
  const tokenTask = token?.platformContext.custom?.writing_task; // set if LTI specified and writing_task included in custom
  let parsedTask: WritingTask | undefined = undefined;
  if (tokenTask) {
    try {
      const taskData = JSON.parse(tokenTask);
      if (isWritingTask(taskData)) {
        parsedTask = taskData;
      } else {
        logger.error('Invalid writing_task structure in LTI token:', {
          taskData,
        });
      }
    } catch (error) {
      logger.error('Error parsing writing_task from LTI token:', { error });
    }
  }
  const task = parsedTask
    ? parsedTask
    : taskId
      ? await findWritingTaskById(taskId)
      : undefined;
  const tasks = task
    ? []
    : (await findAllPublicWritingTasks()).map(({ _id, ...task }) => task); // need everything but _id for preview.

  if (isStudent(token)) {
    // only attempt to grade if the user is a student.
    try {
      if (isTestUser(token)) {
        logger.info('Test user grading initialization.');
      }
      // Not necessarily the most appropriate place to put this, but it ensures that we attempt to grade as soon as possible when the user accesses the app with an LTI token.
      startGrading(Provider.Grade, token);
    } catch (error) {
      logger.error('Error during LTI grade check:', { error });
      // NOOP if grading fails, as this is not critical for the main functionality of the app, and we do not want to block users from using the app if there is an issue with grading.
    }
  }

  return {
    task,
    taskId,
    tasks,
    ltiActivityTitle: token?.platformContext?.resource?.title,
    username: token?.userInfo?.name,
    isLTI: !!token,
    isContentDeveloper: isContentDeveloper(token),
    isInstructor: isInstructor(token),
    isStudent: isStudent(token),
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
