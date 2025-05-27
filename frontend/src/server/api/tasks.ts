import { type Request, type Response, Router } from 'express';
import { param } from 'express-validator';
import {
  FileNotFound,
  InternalServerError,
  UnprocessableContent,
  UnprocessableContentError,
} from '../../lib/ProblemDetails';
import { validateWritingTask } from '../../lib/schemaValidate';
import { isWritingTask } from '../../lib/WritingTask';
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
    try {
      response.send(await findWritingTaskById(fileId));
    } catch (err) {
      console.error(err);
      if (err instanceof ReferenceError) {
        response.status(404).send(FileNotFound(err));
      } else {
        response.status(500).send(InternalServerError(err));
      }
    }
  }
);

writingTasks.get('', async (request: Request, response: Response) => {
  try {
    const rules = await findAllPublicWritingTasks();
    if (request.accepts('html')) {
      response.send(
        `<html><body><h1>Outlines</h1><ul>${rules.map((rule) => `<li><a href="${LTI_HOSTNAME}index.html?writing_task=${'_id' in rule ? rule._id : ''}">${rule.info.name}</a></li>`).join('')}</ul></body></html>`
      );
      return;
    }
    response.send(rules); // need everything for preview.
  } catch (err) {
    console.error(err);
    response.status(500).send(InternalServerError(err));
  }
});

writingTasks.post('', async (request: Request, response: Response) => {
  try {
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
    const writing_task_id = (await insertWritingTask(task)).toString();
    response.send(writing_task_id);
  } catch (err) {
    if (
      err instanceof SyntaxError ||
      err instanceof UnprocessableContentError
    ) {
      response.status(422).send(UnprocessableContent(err));
    } else {
      response.status(500).send(InternalServerError(err));
    }
  }
});
