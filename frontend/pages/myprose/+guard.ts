import { redirect } from 'vike/abort';
import { PageContextServer } from 'vike/types';

export async function guard({ auth, urlPathname }: PageContextServer) {
  if (!auth?.user) {
    const searchParams = new URLSearchParams({ redirectTo: urlPathname });
    throw redirect(`/auth/sign-in?${searchParams.toString()}`);
  }
}
