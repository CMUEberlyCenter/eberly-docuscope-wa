import { type Request, type Response, Router } from 'express';
import { param } from 'express-validator';
import { UnprocessableContentError } from '../../lib/ProblemDetails';
import { validateWritingTask } from '../../lib/schemaValidate';
import { isWritingTask, isWritingTaskIdValid } from '../../lib/WritingTask';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
  insertWritingTask,
} from '../data/mongo';
import { validate } from '../model/validate';
import { LTI_HOSTNAME } from '../settings';

export const writingTasks = Router();

// Replacing with fs.watch
// writingTasks.patch('/update', async (_request: Request, response: Response) => {
//   try {
//     await updatePublicWritingTasks();
//     response.sendStatus(204);
//   } catch (err) {
//     console.error(err);
//     response.status(500).send(InternalServerError(err));
//   }
// });

writingTasks.get(
  '/:fileId',
  validate(param('fileId').isMongoId()),
  async (request: Request, response: Response) => {
    const fileId = request.params.fileId;
    response.send(await findWritingTaskById(fileId));
  }
);

writingTasks.get('', async (request: Request, response: Response) => {
  const rules = await findAllPublicWritingTasks();
  if (request.accepts('html')) {
    response.send(
      `<html><body><h1>Outlines</h1><ul>${rules.map((rule) => `<li><a href="${LTI_HOSTNAME}index.html?writing_task=${'_id' in rule ? rule._id : ''}">${rule.info.name}</a></li>`).join('')}</ul></body></html>`
    );
    return;
  }
  response.send(rules); // need everything for preview.
});

writingTasks.post('', async (request: Request, response: Response) => {
  const task = request.body;
  const valid = validateWritingTask(task);
  if (!valid) {
    throw new UnprocessableContentError(
      validateWritingTask.errors,
      'Invalid JSON'
    );
  }
  if (!isWritingTask(task)) {
    throw new UnprocessableContentError(['Failed type check.'], 'Invalid JSON');
  }
  if (!isWritingTaskIdValid(task.info.id)) {
    throw new UnprocessableContentError(
      ['Invalid info.id value. Must be a valid URI fragment.'],
      'Invalid JSON'
    );
  }
  const writing_task_id = (await insertWritingTask(task)).toString();
  response.send(writing_task_id);
});
