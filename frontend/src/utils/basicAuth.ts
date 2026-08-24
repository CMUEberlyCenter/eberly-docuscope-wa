import basicAuth from 'express-basic-auth';
import { ADMIN_PASSWORD } from '../server/settings';
import { enhance } from '@universal-middleware/core';

export const basicAuthMiddleware = basicAuth({
  users: { admin: ADMIN_PASSWORD },
  challenge: true,
  realm: 'myProse Admin Area',
});

export const BasicUserMiddleware = enhance(
  async (request, context, _runtime) => {
    const user = request.auth?.user ?? null;
    const isAdmin = user === 'admin';
    return { ...context, user, isAdmin };
  },
  {
    name: 'myprose:BasicUserMiddleware',
    immutable: false,
  }
);
