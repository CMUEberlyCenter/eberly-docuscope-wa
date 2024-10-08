import { Request, Response, Router } from 'express';
import {
  BadRequest,
  InternalServerError,
  Unauthorized,
} from '../../lib/ProblemDetails';
import { isWritingTask } from '../../lib/WritingTask';
import { updateAssignmentWritingTask } from '../data/mongo';
import { IdToken, isInstructor } from '../model/lti';

export const assignments = Router();

/** @deprecated */
assignments.post('/', async (request: Request, response: Response) => {
  const token: IdToken = response.locals.token;
  if (!token || !isInstructor(token.platformContext)) {
    // TODO: add other admin roles
    response
      .status(401)
      .send(Unauthorized('User does not have Instructor role.')); // Unauthorized
    return;
  }
  if (!request.files) {
    response.status(400).send(BadRequest('Null files!'));
    return;
  }
  try {
    const file = request.files.file;
    if (file instanceof Array) {
      response.status(400).send(BadRequest('Multiple files unsupported.'));
      return;
    }
    const json = JSON.parse(file.data.toString('utf-8'));
    if (!isWritingTask(json)) {
      response
        .status(400)
        .send(BadRequest('Not a valid writing task specification.'));
      return;
    }
    await updateAssignmentWritingTask(token.platformContext.resource.id, json);
  } catch (err) {
    console.error(err);
    if (err instanceof SyntaxError) {
      response.status(400).send(BadRequest(err));
      return;
    }
    response.status(500).send(InternalServerError(err));
    return;
  }
  response.sendStatus(200); // 201?
});
