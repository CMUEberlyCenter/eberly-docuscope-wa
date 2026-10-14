import { getDb } from '#/server/data/mongo.ts';
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
