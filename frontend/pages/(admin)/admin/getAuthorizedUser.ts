import { TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger';
import { Abort, getContext } from 'telefunc';

export function getAuthorizedUser() {
  const { user, isAdmin } = getContext<TelefuncContext>();
  if (!user || !isAdmin) {
    logger.error('Unauthorized attempt to use admin functionality', {
      user,
      isAdmin,
    });
    throw Abort({ status: 403, message: 'FORBIDDEN' });
  }
  return user;
}
