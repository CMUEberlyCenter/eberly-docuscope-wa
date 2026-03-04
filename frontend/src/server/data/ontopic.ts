import type { OnTopicData } from '../../lib/OnTopicData';
import { GatewayError } from '../../lib/ProblemDetails';
import type { OnTopicReviewData } from '../../lib/ReviewResponse';
import { ONTOPIC_URL } from '../settings';

/**
 * Submit data to onTopic for processing.
 * @param document Text to process.
 * @param acceptLanguage The forwarded accept-language header value.
 * @param signal Optional AbortSignal to cancel the request.
 * @returns Processed data.
 * @throws fetch errors
 * @throws GatewayError on bad onTopic response status
 * @throws JSON.parse errors
 */
export const doOnTopic = async (
  document: string,
  acceptLanguage?: string,
  signal?: AbortSignal
): Promise<OnTopicReviewData | undefined> => {
  const res = await fetch(ONTOPIC_URL, {
    method: 'POST',
    body: JSON.stringify({
      base: document,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      // forward accept-language header, default to '*' if not present.
      'Accept-Language': acceptLanguage || '*',
    },
    signal,
  });
  if (!res.ok) {
    // TODO check for response codes and throw specific errors.
    throw new GatewayError(
      `onTopic Response status: ${res.status} - ${res.statusText} - ${await res.text()}`,
      {
        cause: res.statusText,
      }
    );
  }
  const data = (await res.json()) as OnTopicData;
  return {
    tool: 'ontopic',
    datetime: new Date(),
    response: data,
  };
};
