import type { NextFunction, Request, Response } from 'express';
import type { ContextRunner } from 'express-validator';
import { BadRequest } from '../../lib/ProblemDetails';

/** Middleware for running express-validator validations. */
export const validate = (...validations: ContextRunner[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const valid = await validation.run(req);
      if (!valid.isEmpty()) {
        res.status(400).send(BadRequest(JSON.stringify(valid.array())));
        return; // abort on any error.
      }
    }
    next();
  };
};
