import { redirect } from 'vike/abort';
import { type PageContextServer } from 'vike/types';

export const guard = async ({launchContext}: PageContextServer) => {
  if (launchContext?.idToken.launch?.custom?.tool === 'draft') {
    throw redirect('/draft');
  }
  if (launchContext?.idToken.launch?.custom?.tool === 'review') {
    throw redirect('/review');
  }
  throw redirect('/draft');
};
