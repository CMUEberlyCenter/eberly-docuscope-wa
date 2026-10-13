import { TelefuncContext } from '#lib/TelefuncContext';
import { logger } from '#server/logger';
import { Abort, getContext } from 'telefunc';

/**
 * Gets the authorized user from the Telefunc context.
 * @returns user information.
 * @throws telefunc.Abort with status 403 if the user is not authorized.
 */
export function getAuthorizedUser() {
  const { auth } = getContext<TelefuncContext>();
  if (!auth?.user || auth?.user.role !== 'admin') {
    logger.error('Unauthorized attempt to use admin functionality', {
      authUser: auth?.user,
      isAdmin: auth?.user?.role === 'admin',
    });
    throw Abort({ status: 403, message: 'FORBIDDEN' });
  }
  return auth.user;
}
