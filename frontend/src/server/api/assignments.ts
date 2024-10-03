import { Request, Response, Router } from 'express';
import { BadRequest, InternalServerError } from '../../lib/ProblemDetails';
import { isWritingTask } from '../../lib/WritingTask';
import { updateAssignmentWritingTask } from '../data/mongo';
import { IdToken, isInstructor } from '../model/lti';

export const assignments = Router();

assignments.post('/', async (request: Request, response: Response) => {
  const token: IdToken = response.locals.token;
  if (!token || !isInstructor(token.platformContext)) {
    // TODO: add other admin roles
    return response.sendStatus(401); // Unauthorized
  }
  if (!request.files) {
    return response.status(400).send(BadRequest('Null files!'));
  }
  try {
    const file = request.files.file;
    if (file instanceof Array) {
      return response
        .sendStatus(400)
        .send(BadRequest('Multiple files unsupported.'));
    }
    const json = JSON.parse(file.data.toString('utf-8'));
    if (!isWritingTask(json)) {
      return response
        .status(400)
        .send(BadRequest('Not a valid writing task specification.'));
    }
    await updateAssignmentWritingTask(token.platformContext.resource.id, json);
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      return response.status(400).send(BadRequest(err));
    }
    return response.status(500).send(InternalServerError(err));
  }
  return response.sendStatus(200); // 201?
});
