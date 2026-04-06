import { type Request, type Response, Router } from 'express';
import { param } from 'express-validator';
import { UnprocessableContentError } from '../../lib/ProblemDetails';
import { validateWritingTask } from '../../lib/schemaValidate';
import {
  isWritingTask,
  isWritingTaskIdValid,
  WritingTask,
} from '../../lib/WritingTask';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
  insertWritingTask,
} from '../data/mongo';
import { validate } from '../model/validate';
import { LTI_HOSTNAME } from '../settings';

export const writingTasks = Router();

/**
 * Endpoint for fetching a writing task by ID, used for loading a specific writing task.
 * @deprecated No longer used by frontend as this is handled by +data hooks.
 */
writingTasks.get(
  '/:fileId',
  validate(param('fileId').isMongoId().not().isArray()),
  async (request: Request<{ fileId: string }>, response: Response) => {
    const fileId = request.params.fileId;
    if (Array.isArray(fileId)) {
      // This should not be necessary as params should be a single string.
      throw new UnprocessableContentError(
        ['fileId must be a single value.'],
        'Invalid fileId parameter'
      );
    }
    response.send(await findWritingTaskById(fileId));
  }
);

/**
 * Endpoint for fetching all public writing tasks.
 * @deprecated No longer used by frontend as this is handled by +data hooks, potentially still useful for testing.
 */
writingTasks.get('', async (request: Request, response: Response) => {
  const rules = await findAllPublicWritingTasks();
  if (request.accepts('html')) {
    response.send(
      `<html><body><h1>Writing Tasks</h1><ul>${rules.map((rule) => `<li><a href="${LTI_HOSTNAME}index.html?writing_task=${rule.info.id ?? rule._id ?? ''}">${rule.info.name}</a></li>`).join('')}</ul></body></html>`
    );
    return;
  }
  response.send(rules.map(({ _id, ...task }) => task as WritingTask)); // need everything but _id for preview.
});

/**
 * Endpoint for creating a new writing task.
 * Used by the admin interface for uploading custom writing tasks.
 */
writingTasks.post(
  '',
  /*basicAuthMiddleware,*/ async (request: Request, response: Response) => {
    // TODO validate that the user is an instructor/admin, currently anyone can upload writing tasks.
    // Secure this when genlink is depricated in favor of admin/genlink which will require authentication.
    const task = request.body;
    const valid = validateWritingTask(task);
    if (!valid) {
      throw new UnprocessableContentError(
        validateWritingTask.errors,
        'Invalid JSON'
      );
    }
    if (!isWritingTask(task)) {
      throw new UnprocessableContentError(
        ['Failed type check.'],
        'Invalid JSON'
      );
    }
    if (!isWritingTaskIdValid(task.info.id)) {
      throw new UnprocessableContentError(
        ['Invalid info.id value. Must be a valid URI fragment.'],
        'Invalid JSON'
      );
    }
    const writing_task_id = (await insertWritingTask(task)).toString();
    response.send(writing_task_id);
  }
);
