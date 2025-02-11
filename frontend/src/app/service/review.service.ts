import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import { BehaviorSubject, filter, map, Observable, scan } from 'rxjs';
import {
  CivilToneData,
  ErrorData,
  EthosData,
  ExpectationsData,
  KeyIdeasData,
  LinesOfArgumentsData,
  LogicalFlowData,
  OnTopicReviewData,
  ParagraphClarityData,
  PathosData,
  ProfessionalToneData,
  SourcesData,
} from '../../lib/ReviewResponse';
import { isWritingTask } from '../../lib/WritingTask';
import { isReview, Review } from '../../server/model/review';
import { getLtiRequest } from './lti.service';
import { writingTask } from './writing-task.service';

const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');
// class FatalError extends Error {}

export const [useReview, review$] = bind<SUSPENSE | Review>(
  new Observable((subscriber) => {
    subscriber.next(SUSPENSE);
    const ctrl = new AbortController();
    // TODO: add tool query parameter based on configured available.
    fetchEventSource(`/api/v2/reviews/${id}`, {
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
  }),
  SUSPENSE
);

review$.subscribe((rev) => {
  if (isReview(rev)) {
    writingTask.next(isWritingTask(rev.writing_task) ? rev.writing_task : null);
  }
});

// const globalCoherenceAnalysis = new BehaviorSubject<GlobalCoherenceData | null>(
//   null
// );
type OptionalError<T> = T | ErrorData | null;
const civilToneAnalysis = new BehaviorSubject<OptionalError<CivilToneData>>(
  null
);
const ethosAnalysis = new BehaviorSubject<OptionalError<EthosData>>(null);
const keyIdeasAnalysis = new BehaviorSubject<OptionalError<KeyIdeasData>>(null);
const linesOfArgumentsAnalysis = new BehaviorSubject<
  OptionalError<LinesOfArgumentsData>
>(null);
const logicalFlowAnalysis = new BehaviorSubject<OptionalError<LogicalFlowData>>(
  null
);
const paragraphClarityAnalysis = new BehaviorSubject<
  OptionalError<ParagraphClarityData>
>(null);
const pathosAnalysis = new BehaviorSubject<OptionalError<PathosData>>(null);
const professionalToneAnalysis = new BehaviorSubject<
  OptionalError<ProfessionalToneData>
>(null);
const sourcesAnalysis = new BehaviorSubject<OptionalError<SourcesData>>(null);
const ontopicAnalysis = new BehaviorSubject<OptionalError<OnTopicReviewData>>(
  null
);
export type OptionalExpectations =
  | ExpectationsData
  | (ErrorData & { expectation: string })
  | null;
const expectationsAnalysis = new BehaviorSubject<OptionalExpectations>(null);

review$
  .pipe(
    filter((rev) => isReview(rev)),
    map((rev) => rev.analysis)
  )
  .subscribe((analyses) =>
    analyses.forEach((analysis) => {
      // const expectations = new Map<string, AllExpectationsData>();
      switch (analysis.tool) {
        // TODO add shape checks
        case 'civil_tone':
          civilToneAnalysis.next(analysis);
          break;
        case 'ethos':
          ethosAnalysis.next(analysis);
          break;
        case 'expectations':
          if ('expectation' in analysis) expectationsAnalysis.next(analysis);
          else console.warn('No expectation is expectation response!');
          break;
        case 'key_ideas':
          keyIdeasAnalysis.next(analysis);
          break;
        case 'lines_of_arguments':
          linesOfArgumentsAnalysis.next(analysis);
          break;
        case 'logical_flow':
          logicalFlowAnalysis.next(analysis);
          break;
        case 'paragraph_clarity':
          paragraphClarityAnalysis.next(analysis);
          break;
        case 'pathos':
          pathosAnalysis.next(analysis);
          break;
        case 'professional_tone':
          professionalToneAnalysis.next(analysis);
          break;
        case 'sources':
          sourcesAnalysis.next(analysis);
          break;
        case 'ontopic':
          ontopicAnalysis.next(analysis);
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
export const [useCivilToneData, civilToneData$] = bind(civilToneAnalysis, null);
export const [useEthosData, ethosData$] = bind(ethosAnalysis, null);
export const [useKeyIdeasData, keyPointsData$] = bind(keyIdeasAnalysis, null);
export const [useLinesOfArgumentsData, argumentsData$] = bind(
  linesOfArgumentsAnalysis,
  null
);
export const [useLogicalFlowData, logicalFlowData$] = bind(
  logicalFlowAnalysis,
  null
);
export const [useParagraphClarityData, paragraphClarityData$] = bind(
  paragraphClarityAnalysis,
  null
);
export const [usePathosData, pathosData$] = bind(pathosAnalysis, null);
export const [useProfessionalToneData, professionalToneData$] = bind(
  professionalToneAnalysis,
  null
);
export const [useSourcesData, sourcesData$] = bind(sourcesAnalysis, null);
export const [useOnTopicData, onTopicData$] = bind(ontopicAnalysis, null);
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
