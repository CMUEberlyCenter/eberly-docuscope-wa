import basicAuth from 'express-basic-auth';
import { ADMIN_PASSWORD } from '../server/settings';

export const basicAuthMiddleware = basicAuth({
  users: { admin: ADMIN_PASSWORD },
  challenge: true,
  realm: 'myProse Admin Area',
});
