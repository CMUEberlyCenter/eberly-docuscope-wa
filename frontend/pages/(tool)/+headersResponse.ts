import type { PageContextServer } from 'vike/types';

export async function headersResponse(_pageContext: PageContextServer) {
  // pageContext.headersResponse.delete('Cross-Origin-Embedder-Policy');
  // pageContext.headersResponse.delete('Cross-Origin-Resource-Policy');
  return {
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // 'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}
