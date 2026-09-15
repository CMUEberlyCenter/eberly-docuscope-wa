import { TelefuncContext } from '#lib/TelefuncContext.js';
import { logger } from '#server/logger';
import { Abort, getContext } from 'telefunc';

/**
 * Gets the authorized user from the Telefunc context.
 * @returns user information.
 * @throws telefunc.Abort with status 403 if the user is not authorized.
 */
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
