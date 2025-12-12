import type { OnTopicData } from '../../lib/OnTopicData';
import { GatewayError } from '../../lib/ProblemDetails';
import type { OnTopicReviewData } from '../../lib/ReviewResponse';
import { ONTOPIC_URL } from '../settings';

/**
 * Submit data to onTopic for processing.
 * @param review Review data to be sent to onTopic
 * @returns Processed data.
 * @throws fetch errors
 * @throws Bad onTopic response status
 * @throws JSON.parse errors
 */
export const doOnTopic = async (
  document: string,
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
    },
    signal,
  });
  if (!res.ok) {
    console.error(
      `Bad response from ontopic: ${res.status} - ${res.statusText} - ${await res.text()}`
    );
    // TODO check for response codes and throw specific errors.
    throw new GatewayError(`onTopic Response status: ${res.status}`, {
      cause: res.statusText,
    });
  }
  const data = (await res.json()) as OnTopicData;
  return {
    tool: 'ontopic',
    datetime: new Date(),
    response: data,
  };
};
