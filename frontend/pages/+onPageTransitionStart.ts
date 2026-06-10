import type { PageContextClient } from 'vike/types';

export const onPageTransitionStart = async (
  _pageContext: Partial<PageContextClient>
) => {
  document.querySelector('body')?.classList.add('page-is-transitioning');
};
