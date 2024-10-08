import { Request, Response, Router } from 'express';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
  updatePublicWritingTasks,
} from '../data/mongo';
import { FileNotFound, InternalServerError } from '../../lib/ProblemDetails';

export const writingTasks = Router();

writingTasks.patch('/update', async (_request: Request, response: Response) => {
  try {
    await updatePublicWritingTasks();
    response.sendStatus(204);
  } catch (err) {
    console.error(err);
    response.status(500).send(InternalServerError(err));
  }
});

writingTasks.get('/:fileId', async (request: Request, response: Response) => {
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
});

writingTasks.get('', async (_request: Request, response: Response) => {
  try {
    const rules = await findAllPublicWritingTasks();
    response.send(rules); // need everything for preview.
  } catch (err) {
    console.error(err);
    response.status(500).send(InternalServerError(err));
  }
});
