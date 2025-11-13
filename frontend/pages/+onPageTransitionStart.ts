import type { PageContextClient } from 'vike/types';

export const onPageTransitionStart = async (
  _pageContext: Partial<PageContextClient>
) => {
  // console.log('Page transition start');
  document.querySelector('body')?.classList.add('page-is-transitioning');
};
