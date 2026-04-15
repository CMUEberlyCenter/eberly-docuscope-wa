import type { PageContextServer } from 'vike/types';

export async function headersResponse(_pageContext: PageContextServer) {
  // Delete COEP and CORP headers to get Google Drive Picker to work, needs to be done in route handler.
  // pageContext.headersResponse.delete('Cross-Origin-Embedder-Policy');
  // pageContext.headersResponse.delete('Cross-Origin-Resource-Policy');
  return {
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // 'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}
