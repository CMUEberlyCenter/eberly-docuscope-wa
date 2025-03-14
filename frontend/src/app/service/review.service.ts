import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  scan,
  shareReplay,
  switchMap,
} from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import {
  CivilToneData,
  ErrorData,
  EthosData,
  ExpectationsData,
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

export const [useExpectations, expectations$] = bind<SUSPENSE | Review>(
  fetchObservable('expectations'),
  SUSPENSE
);

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

// const globalCoherenceAnalysis = new BehaviorSubject<GlobalCoherenceData | null>(
//   null
// );
type OptionalError<T> = T | ErrorData | null;
// const civilToneAnalysis = new BehaviorSubject<OptionalError<CivilToneData>>(
//   null
// );
// const ethosAnalysis = new BehaviorSubject<OptionalError<EthosData>>(null);
// const prominentTopicsAnalysis = new BehaviorSubject<
//   OptionalError<ProminentTopicsData>
// >(null);
// const linesOfArgumentsAnalysis = new BehaviorSubject<
//   OptionalError<LinesOfArgumentsData>
// >(null);
// const logicalFlowAnalysis = new BehaviorSubject<OptionalError<LogicalFlowData>>(
//   null
// );
// const paragraphClarityAnalysis = new BehaviorSubject<
//   OptionalError<ParagraphClarityData>
// >(null);
// const pathosAnalysis = new BehaviorSubject<OptionalError<PathosData>>(null);
// const professionalToneAnalysis = new BehaviorSubject<
//   OptionalError<ProfessionalToneData>
// >(null);
// const sourcesAnalysis = new BehaviorSubject<OptionalError<SourcesData>>(null);
// const ontopicAnalysis = new BehaviorSubject<OptionalError<OnTopicReviewData>>(
//   null
// );
export type OptionalExpectations =
  | ExpectationsData
  | (ErrorData & { expectation: string })
  | null;
const expectationsAnalysis = new BehaviorSubject<OptionalExpectations>(null);

expectations$
  .pipe(
    filter((rev) => isReview(rev)),
    map((rev) => rev.analysis)
  )
  .subscribe((analyses) =>
    analyses.forEach((analysis) => {
      switch (analysis.tool) {
        // TODO add shape checks
        case 'civil_tone':
          // civilToneAnalysis.next(analysis);
          break;
        case 'ethos':
          // ethosAnalysis.next(analysis);
          break;
        case 'expectations':
          if ('expectation' in analysis) expectationsAnalysis.next(analysis);
          else console.warn('No expectation is expectations response!');
          break;
        case 'prominent_topics':
          // prominentTopicsAnalysis.next(analysis);
          break;
        case 'lines_of_arguments':
          // linesOfArgumentsAnalysis.next(analysis);
          break;
        case 'logical_flow':
          // logicalFlowAnalysis.next(analysis);
          break;
        case 'paragraph_clarity':
          // paragraphClarityAnalysis.next(analysis);
          break;
        case 'pathos':
          // pathosAnalysis.next(analysis);
          break;
        case 'professional_tone':
          // professionalToneAnalysis.next(analysis);
          break;
        case 'sources':
          // sourcesAnalysis.next(analysis);
          break;
        case 'ontopic':
          // ontopicAnalysis.next(analysis);
          break;
        case 'docuscope':
        default:
          // expectations.set(analysis.expectation, analysis);
          break;
      }
      // allExpectationsAnalysis.next(expectations);
    })
  );

// export const [useGlobalCoherenceData, globalCoherenceData$] = bind(
//   globalCoherenceAnalysis,
//   null
// );

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
export const [useCivilToneData, civilToneData$] = bind(
  fetchReview<OptionalError<CivilToneData>>('civil_tone'),
  null
);
export const [useEthosData, ethosData$] = bind(
  fetchReview<OptionalError<EthosData>>('ethos'),
  null
);
export const [useProminentTopicsData, prominentTopicsData$] = bind(
  fetchReview<OptionalError<ProminentTopicsData>>('prominent_topics'),
  null
);
export const [useLinesOfArgumentsData, argumentsData$] = bind(
  fetchReview<OptionalError<LinesOfArgumentsData>>('lines_of_arguments'),
  null
);
export const [useLogicalFlowData, logicalFlowData$] = bind(
  fetchReview<OptionalError<LogicalFlowData>>('logical_flow'),
  null
);
export const [useParagraphClarityData, paragraphClarityData$] = bind(
  fetchReview<OptionalError<ParagraphClarityData>>('paragraph_clarity'),
  null
);
export const [usePathosData, pathosData$] = bind(
  fetchReview<OptionalError<PathosData>>('pathos'),
  null
);
export const [useProfessionalToneData, professionalToneData$] = bind(
  fetchReview<OptionalError<ProfessionalToneData>>('professional_tone'),
  null
);
export const [useSourcesData, sourcesData$] = bind(
  fetchReview<OptionalError<SourcesData>>('sources'),
  null
);

export const [useExpectationsData, expectationsData$] = bind(
  expectationsAnalysis.pipe(
    scan(
      (
        acc: Map<string, OptionalExpectations>,
        current: OptionalExpectations
      ) => {
        if (!current) {
          return acc;
        }
        const m = new Map(acc);
        m.set(current.expectation, current);
        return m;
      },
      new Map<string, OptionalExpectations>()
    )
  ),
  null
);
expectationsData$.subscribe(() => undefined); // at least one subscription to make sure it works.

export const [useOnTopicReview, onTopicReview$] = bind(
  fromFetch(`/api/v2/reviews/${REVIEW_ID}/ontopic`).pipe(
    switchMap(async (response) => await response.json()),
    filter((data): data is Review => isReview(data)),
    shareReplay(1) // TODO errors
  ),
  null
);
export const [useOnTopicData, onTopicData$] = bind(
  onTopicReview$.pipe(
    map((data) => data?.analysis.find((a) => isOnTopicReviewData(a))),
    filter((data) => !!data)
  ),
  null
);
export const [useOnTopicProse, onTopicProse$] = bind(
  onTopicData$.pipe(
    map((data) => data?.response.html ?? ''),
    distinctUntilChanged()
  ),
  null
);
