import type { PageContextClient } from 'vike/types';

export const onPageTransitionEnd = async (
  _pageContext: Partial<PageContextClient>
) => {
  document.querySelector('body')?.classList.remove('page-is-transitioning');
};
