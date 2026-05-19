import { logger } from '#server/logger.js';
import { Abort, getContext } from 'telefunc';

export function getAuthorizedUser() {
  const { user } = getContext<{ user?: string }>();
  if (!user) {
    logger.error('Unauthorized attempt to use admin functionality', { user });
    throw Abort({ status: 403, message: 'FORBIDDEN' });
  }
  return user;
}
