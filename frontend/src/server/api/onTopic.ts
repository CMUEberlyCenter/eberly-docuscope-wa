import { Request, Response, Router } from 'express';
import { InternalServerError } from '../../lib/ProblemDetails';
import { updateMetrics, updateResponseAvg } from '../prometheus';
import { ONTOPIC_URL } from '../settings';

export const ontopic = Router();

/** middleware for collecting metrics. */
ontopic.use('/', async (request: Request, response: Response, next) => {
  // TODO replace with some prometheus library.
  const start = Date.now();
  updateMetrics();
  next();
  updateResponseAvg(Date.now() - start);
});

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
      return response.status(res.status).send(res.statusText);
    }
    const ret = await res.json();

    return response.json(ret);
  } catch (err) {
    console.error(err);
    return response.status(500).send(InternalServerError(err));
  }
});
