import type { PageContextServer } from 'vike/types';

export async function headersResponse(pageContext: PageContextServer) {
  // Delete COEP and CORP headers to get Google Drive Picker to work, needs to be done in route handler.
  // pageContext.headersResponse.delete('Cross-Origin-Embedder-Policy');
  // pageContext.headersResponse.delete('Cross-Origin-Resource-Policy');
  return {
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    // 'Cross-Origin-Embedder-Policy': 'require-corp',
    'Content-Security-Policy': [
      `script-src 'self' 'nonce-${pageContext.cspNonce}' https://apis.google.com https://accounts.google.com https://www.googletagmanager.com`,
      `frame-src 'self' https://docs.google.com https://drive.google.com https://accounts.google.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: https://*.googleusercontent.com`,
      `font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com`,
      `connect-src 'self' https://*.googleapis.com`,
      `default-src 'self'`,
    ].join('; '),
  };
}
