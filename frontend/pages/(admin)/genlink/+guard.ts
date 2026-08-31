import { redirect } from 'vike/abort';

export function guard() {
  // Redirect to the admin genlink page
  // This is a temporary measure to prevent access to the genlink page for non-admin users.
  // TODO: Remove the /genlink route.
  throw redirect('/admin/genlink');
}
