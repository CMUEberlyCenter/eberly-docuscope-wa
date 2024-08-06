import { Request, Response, Router } from 'express';
import {
  findAllPublicWritingTasks,
  findWritingTaskById,
  updatePublicWritingTasks,
} from '../data/mongo';
import { FileNotFound, InternalServerError } from '../../lib/ProblemDetails';

export const writingTasks = Router();
writingTasks.patch('/update', async (request: Request, response: Response) => {
  try {
    await updatePublicWritingTasks();
    return response.sendStatus(204);
  } catch (err) {
    console.error(err);
    return response.status(500).send(InternalServerError(err));
  }
});
writingTasks.get('/:fileId', async (request: Request, response: Response) => {
  const fileId = request.params.fileId;
  try {
    return response.send(await findWritingTaskById(fileId));
  } catch (err) {
    console.error(err);
    if (err instanceof ReferenceError) {
      return response.status(404).send(FileNotFound(err));
    }
    return response.status(500).send(InternalServerError(err));
  }
});
writingTasks.get('', async (request: Request, response: Response) => {
  try {
    const rules = await findAllPublicWritingTasks();
    return response.send(rules); // need everything for preview.
  } catch (err) {
    console.error(err);
    return response.status(500).send(InternalServerError(err));
  }
});
