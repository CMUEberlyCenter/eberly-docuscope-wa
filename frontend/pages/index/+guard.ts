import { redirect } from 'vike/abort';
import { PageContextServer } from 'vike/types';

export const guard = async ({ launchContext, auth }: PageContextServer) => {
  if (launchContext) {
    if (launchContext?.idToken.launch?.custom?.tool === 'draft') {
      throw redirect('/draft');
    }
    if (launchContext?.idToken.launch?.custom?.tool === 'review') {
      throw redirect('/review');
    }
    throw redirect('/draft');
  }
  if (auth) {
    switch (auth.user.role) {
      case 'admin':
        throw redirect('/admin');
      default:
        throw redirect('/myprose');
    }
  }
  // throw redirect('https://www.cmu.edu/corecompetencies/communication/resources-and-tools/myprose/index.html')
};
