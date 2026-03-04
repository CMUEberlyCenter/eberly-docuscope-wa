import { GatewayError } from '../../lib/ProblemDetails';
import { SEGMENT_URL } from '../settings';

/**
 * Segments the given text into sentences.
 * @param text content of editor.
 * @param acceptLanguage The forwarded accept-language header value.
 * @returns HTML string.
 * @throws GatewayError on bad service status.
 * @throws Network errors.
 * @throws JSON parse errors.
 */
export const segmentText = async (
  text: string,
  acceptLanguage?: string
): Promise<string> => {
  const res = await fetch(SEGMENT_URL, {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // forward accept-language header, default to '*' if not present.
      'Accept-Language': acceptLanguage || '*',
    },
  });
  if (!res.ok) {
    throw new GatewayError(
      `Bad service response from 'segment': ${res.status} - ${res.statusText} - ${await res.text()}`,
      { cause: res.statusText }
    );
  }
  const data = (await res.json()) as string;
  return data.trim();
};
