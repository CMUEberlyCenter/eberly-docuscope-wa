import { getDb, getUser, updateUserRole } from '#/server/data/mongo.ts';
import { logger } from '#server/logger.ts';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  LTI_HOSTNAME,
} from '#server/settings.ts';
import { OrganizationInvitationEmail } from '@better-auth-ui/react/email';
import { i18n, locales } from '@better-auth/i18n';
import { render } from '@react-email/render';
import {
  enhance,
  Get,
  MiddlewareOrder,
  UniversalHandler,
} from '@universal-middleware/core';
import { betterAuth, User } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { toNodeHandler } from 'better-auth/node';
import { haveIBeenPwned, organization } from 'better-auth/plugins';
import { admin } from 'better-auth/plugins/admin';
import { username } from 'better-auth/plugins/username';
import { createElement } from 'react';
import { sendEmail } from './email';
// import { OrganizationInvitationEmail } from '#components/auth/email/organization-invitation.tsx';

export const auth = betterAuth({
  database: mongodbAdapter(await getDb()),
  baseURL: LTI_HOSTNAME.toString(),
  emailAndPassword: {
    // disableSignUp: true, // TODO: also requires changes in Signin and auth/+guard
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    onExistingUserSignUp: async ({ user }, _request) => {
      void sendEmail({
        to: user.email,
        subject: 'Sign-up attempt with your email',
        text: 'Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.',
      });
    },
    sendResetPassword: async ({ user, url }, _request) => {
      void sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Click the link to reset your password: ${url}`,
        html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
      });
    },
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      // Admin plugin fields (in schema order)
      role: 'user',
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      // ID must be last to match database output order
      id,
    }),
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, _request) => {
      void sendEmail({
        to: user.email,
        subject: 'Verify your email address',
        text: `Click the link to verify your email: ${url}`,
        html: `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>`,
      });
    },
  },
  plugins: [
    admin(),
    username(),
    i18n({ translations: locales }),
    haveIBeenPwned({
      enabled: process.env.NODE_ENV === 'production',
    }),
    organization({
      allowUserToCreateOrganizations: async ({
        role,
      }: User & { role?: string }) => {
        // Only allow users with the "admin" role to create organizations
        return role === 'admin';
      },
      allowUserToInviteMembers: async ({ role }: User & { role?: string }) => {
        // Only allow users with the "admin" role to invite members
        return role === 'admin';
      },
      async sendInvitationEmail({ id, email, organization, inviter, role }) {
        const url = new URL(`/auth/accept-invitation`, LTI_HOSTNAME);
        url.searchParams.set('invitationId', id);
        const html = await render(
          createElement(OrganizationInvitationEmail, {
            url: url.toString(),
            email,
            inviterName: inviter.user.name,
            inviterEmail: inviter.user.email,
            organizationName: organization.name,
            organizationLogoURL: organization.logo ?? undefined,
            role,
            appName: process.env.PRODUCT ?? 'myProse',
          })
        );
        await sendEmail({
          to: email,
          subject: `Invitation to join ${organization.name}`,
          html,
        });
      },
    }),
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});

export const authMiddleware = toNodeHandler(auth);
export const authHandler = (() =>
  enhance(auth.handler, {
    path: '/api/auth/**',
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    order: MiddlewareOrder.AUTHENTICATION,
  })) satisfies Get<[], UniversalHandler>;

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
  console.log('Creating admin user...');
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  console.log(`Admin Username: ${ADMIN_USERNAME}`);
  console.log(`Admin Password: ${ADMIN_PASSWORD}`);
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
