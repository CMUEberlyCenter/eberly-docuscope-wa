import { redirect, render } from 'vike/abort';
import type { PageContextServer } from 'vike/types';

export async function guard({ auth, urlPathname }: PageContextServer) {
  if (!auth?.user) {
    const searchParams = new URLSearchParams({ redirectTo: urlPathname });
    throw redirect(`/auth/sign-in?${searchParams.toString()}`);
  }
  if (auth.user.role !== 'admin') {
    throw render(403, 'Forbidden');
  }
  return;
}
