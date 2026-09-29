import { getDb } from '#/server/data/mongo.ts';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { toNodeHandler } from 'better-auth/node';
import { admin } from 'better-auth/plugins/admin';

export const auth = betterAuth({
  database: mongodbAdapter(await getDb()),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
});

export const authMiddleware = toNodeHandler(auth);

export type AuthSession = typeof auth.$Infer.Session | null;
