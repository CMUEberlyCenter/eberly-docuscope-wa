import { adminClient, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_ENV__BASE_URL,
  plugins: [adminClient(), usernameClient()],
});
