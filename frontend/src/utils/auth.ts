import { getDb, getUser, updateUserRole } from '#/server/data/mongo.ts';
import { logger } from '#server/logger.ts';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
} from '#server/settings.ts';
import { i18n, locales } from '@better-auth/i18n';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { toNodeHandler } from 'better-auth/node';
import { admin } from 'better-auth/plugins/admin';
import { username } from 'better-auth/plugins/username';

export const auth = betterAuth({
  database: mongodbAdapter(await getDb()),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin(), username(), i18n({ translations: locales })],
});

export const authMiddleware = toNodeHandler(auth);

export type AuthSession = typeof auth.$Infer.Session | null;

export async function addAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_USERNAME) {
    throw new Error(
      'Missing environment variables for admin user creation. Please set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_USERNAME.'
    );
  }

  // Check if the admin user already exists using database query
  const existingAdmin = await getUser({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    if (existingAdmin.role === 'admin') {
      logger.info('Admin user already exists.');
    } else {
      updateUserRole({ email: ADMIN_EMAIL, role: 'admin' });
      logger.info('Existing user updated to admin role.');
    }
    return;
  }

  // Create the admin user
  const { user } = await auth.api.signUpEmail({
    body: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_USERNAME,
    },
  });
  if (!user) {
    throw new Error('Failed to create admin user.');
  }
  const success = await updateUserRole({ email: ADMIN_EMAIL, role: 'admin' });
  if (success) {
    logger.info('Admin user created successfully.');
  } else {
    logger.error('Failed to create admin user.');
  }
}
