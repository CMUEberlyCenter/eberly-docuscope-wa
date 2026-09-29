import { MyProseCustomLTIClaims } from '#/server/lti.ts';
import { isWritingTask, WritingTask } from '#lib/WritingTask';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
} from '#server/data/mongo';
import { logger } from '#server/logger';
import {
  isContentDeveloper,
  isInstructor,
  isStudent,
  isTestUser,
  startGrading,
} from '#server/model/lti';
import type { PageContextServer } from 'vike/types';

const getWritingTaskById = async (id: string) => {
  try {
    return await findWritingTaskById(id);
  } catch (error) {
    logger.error('Error finding writing task by ID:', { error });
    return undefined;
  }
};

export async function data(pageContext: PageContextServer) {
  const queryId = pageContext.req.query?.writing_task_id as string | undefined; // get from query string if present
  const sessionId = pageContext.session?.writing_task_id; // get from session if present
  const token = pageContext.launchContext?.idToken; // get from LTI launch context if present
  const { writing_task_id, writing_task } = (token?.launch.custom ||
    {}) as MyProseCustomLTIClaims; // get from LTI token custom claims if present
  const taskId = writing_task_id || queryId || sessionId; // LTI > query > session
  let parsedTask: WritingTask | undefined = undefined;
  if (writing_task) {
    try {
      const taskData = JSON.parse(writing_task);
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
  const task =
    parsedTask ?? (taskId ? await getWritingTaskById(taskId) : undefined);
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
      startGrading(pageContext.launchContext);
    } catch (error) {
      logger.error('Error during LTI grade check:', { error });
      // NOOP if grading fails, as this is not critical for the main functionality of the app, and we do not want to block users from using the app if there is an issue with grading.
    }
  }

  return {
    ltik: pageContext.ltik,
    task,
    taskId,
    tasks,
    // ltiActivityTitle: token?.platformContext?.resource?.title,
    // username: token?.userInfo?.name,
    isLTI: !!token,
    isContentDeveloper: isContentDeveloper(token),
    isInstructor: isInstructor(token),
    isStudent: isStudent(token),
  };
}
export type Data = Awaited<ReturnType<typeof data>>;
