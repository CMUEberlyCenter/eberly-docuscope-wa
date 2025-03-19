import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import {
  distinctUntilChanged,
  filter,
  map,
  Observable,
  shareReplay,
  switchMap,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import {
  CivilToneData,
  ErrorData,
  EthosData,
  ExpectationsData,
  isExpectationsData,
  isOnTopicReviewData,
  LinesOfArgumentsData,
  LogicalFlowData,
  ParagraphClarityData,
  PathosData,
  ProfessionalToneData,
  ProminentTopicsData,
  ReviewPrompt,
  SourcesData,
} from '../../lib/ReviewResponse';
import { isWritingTask } from '../../lib/WritingTask';
import { isReview, Review } from '../../server/model/review';
import { getLtiRequest } from './lti.service';
import { writingTask } from './writing-task.service';

const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');
export const REVIEW_ID = id || '';
// class FatalError extends Error {}

const fetchObservable = (tool?: string): Observable<SUSPENSE | Review> =>
  new Observable((subscriber) => {
    subscriber.next(SUSPENSE);
    const ctrl = new AbortController();

    const toolParam = new URLSearchParams();
    if (tool) {
      toolParam.append('tool', tool);
    }
    // TODO: add tool query parameter based on configured available.
    fetchEventSource(`/api/v2/reviews/${id}/${tool ?? ''}`, {
      ...getLtiRequest,
      signal: ctrl.signal,
      // async onopen(response) {
      //   if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
      //     return;
      //   }
      //   if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      //     throw new FatalError(`Bad return status: ${response.status}`);
      //   }
      //   throw new Error();
      // },
      onerror(err) {
        console.error(err);
        subscriber.error(new Error(err));
        // if (err instanceof FatalError) {
        //   throw err;
        // }
        // else retry
      },
      onmessage(msg) {
        subscriber.next(JSON.parse(msg.data));
      },
      onclose() {
        subscriber.complete();
      },
    });
    return () => ctrl.abort();
  });

const review$ = fromFetch(`/api/v2/reviews/${REVIEW_ID}`).pipe(
  filter((response) => response.ok),
  switchMap(async (response) => await response.json()),
  filter((data): data is Review => isReview(data)),
  shareReplay(1)
);
/** Segmented read only version of the user's text. */
export const [useSegmentedProse, segmented$] = bind<null | string>(
  review$.pipe(
    map((data) => data.segmented),
    distinctUntilChanged()
  ),
  null
);

// Update the writing task from the review when it is available.
review$.subscribe((rev) => {
  if (isReview(rev)) {
    writingTask.next(isWritingTask(rev.writing_task) ? rev.writing_task : null);
  }
});

type OptionalError<T> = T | ErrorData | null;
export type OptionalExpectations =
  | ExpectationsData
  | (ErrorData & { expectation: string })
  | null;

function fetchReview<T>(prompt: ReviewPrompt) {
  return fromFetch(`/api/v2/reviews/${REVIEW_ID}/${prompt}`).pipe(
    switchMap(async (response) => await response.json()),
    filter((data): data is Review => isReview(data)),
    shareReplay(1),
    map((data) => data?.analysis.find((a) => a.tool === prompt)),
    filter((data) => !!data), // TODO errors
    map((data) => data as T)
  );
}
/** Fetch the review data for the civil tone tool. */
export const [useCivilToneData, civilToneData$] = bind(
  fetchReview<OptionalError<CivilToneData>>('civil_tone'),
  null
);
/** Fetch the review data for the ethos tool. */
export const [useEthosData, ethosData$] = bind(
  fetchReview<OptionalError<EthosData>>('ethos'),
  null
);
/** Fetch the review data for the prominent topics tool. */
export const [useProminentTopicsData, prominentTopicsData$] = bind(
  fetchReview<OptionalError<ProminentTopicsData>>('prominent_topics'),
  null
);
/** Fetch the review data for the lines of arguments tool. */
export const [useLinesOfArgumentsData, argumentsData$] = bind(
  fetchReview<OptionalError<LinesOfArgumentsData>>('lines_of_arguments'),
  null
);
/** Fetch the review data for the logical flow tool. */
export const [useLogicalFlowData, logicalFlowData$] = bind(
  fetchReview<OptionalError<LogicalFlowData>>('logical_flow'),
  null
);
/** Fetch the review data for the paragraph clarity tool. */
export const [useParagraphClarityData, paragraphClarityData$] = bind(
  fetchReview<OptionalError<ParagraphClarityData>>('paragraph_clarity'),
  null
);
/** Fetch the review data for the pathos tool. */
export const [usePathosData, pathosData$] = bind(
  fetchReview<OptionalError<PathosData>>('pathos'),
  null
);
/** Fetch the review data for the professional tone tool. */
export const [useProfessionalToneData, professionalToneData$] = bind(
  fetchReview<OptionalError<ProfessionalToneData>>('professional_tone'),
  null
);
/** Fetch the review data for the sources tool. */
export const [useSourcesData, sourcesData$] = bind(
  fetchReview<OptionalError<SourcesData>>('sources'),
  null
);
/** Fetch the review data for the expectations tool. */
export const [useExpectationsData, expectationsData$] = bind(
  fetchObservable('expectations').pipe(
    filter((data): data is Review => isReview(data)),
    map(
      (data) =>
        new Map<string, OptionalExpectations>(
          data.analysis
            .filter(isExpectationsData)
            .map((a) => [a.expectation, a])
        )
    )
  ),
  null
);
/** Fetch the review data for the ontopic tools. */
export const [useOnTopicData, onTopicData$] = bind(
  fromFetch(`/api/v2/reviews/${REVIEW_ID}/ontopic`).pipe(
    switchMap(async (response) => await response.json()),
    filter((data): data is Review => isReview(data)),
    shareReplay(1), // TODO errors
    map((data) => data?.analysis.find((a) => isOnTopicReviewData(a))),
    filter((data) => !!data)
  ),
  null
);
/** Fetch the text for the ontopic tools. */
export const [useOnTopicProse, onTopicProse$] = bind(
  onTopicData$.pipe(
    map((data) => data?.response.html ?? ''),
    distinctUntilChanged()
  ),
  null
);
