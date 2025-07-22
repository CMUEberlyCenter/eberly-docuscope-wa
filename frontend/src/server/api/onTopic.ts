import { type Request, type Response, Router } from 'express';
import { InternalServerError } from '../../lib/ProblemDetails';
import { ONTOPIC_URL } from '../settings';

export const ontopic = Router();

// TODO replace with express-proxy
ontopic.post('/', async (request: Request, response: Response) => {
  try {
    const res = await fetch(ONTOPIC_URL, {
      method: 'POST',
      body: JSON.stringify(request.body),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(
        `Bad response from ontopic: ${res.status} - ${res.statusText}`
      );
      // forward bad response.
      response.status(res.status).send(res.statusText);
      return;
    }
    const ret = await res.json();

    response.json(ret);
  } catch (err) {
    console.error(err);
    response.status(500).send(InternalServerError(err));
  }
});
