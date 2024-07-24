import {Request, Response, Router} from 'express'
import { findReviewById, insertReview } from '../data/mongo';
import { IdToken } from '../model/lti';

export const reviews = Router();

reviews.get('/:id', async (request: Request, response: Response) => {
  const {id} = request.params;
  try {
    const review = await findReviewById(id);
    return response.send(review);
  } catch (err) {
    return response.sendStatus(404);
  }
});
reviews.delete('/:id', async (request: Request, response: Response) => {
  const {id} = request.params
  console.log(`delete ${id}`);
  return response.sendStatus(200);
});
reviews.post('/', async (request: Request, response: Response) => {
  const { document, writing_task } = request.body;
  const token: IdToken | undefined = response.locals.token;
  try {
    const id = await insertReview(document, writing_task, token?.user, token?.platformContext.resource.id);
    return response.send(id);
  } catch (err) {
    return response.sendStatus(500);
  }
});
