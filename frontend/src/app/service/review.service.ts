import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';
import {
  AllExpectationsData,
  ArgumentsData,
  GlobalCoherenceData,
  KeyPointsData,
  OnTopicReviewData,
} from '../../lib/ReviewResponse';
import { isWritingTask } from '../../lib/WritingTask';
import { isReview, Review } from '../../server/model/review';
import { getLtiRequest } from './lti.service';
import { writingTask } from './writing-task.service';

const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');

export const [useReview, review$] = bind<SUSPENSE | Review>(
  new Observable((subscriber) => {
    subscriber.next(SUSPENSE);
    const ctrl = new AbortController();
    fetchEventSource(`/api/v2/reviews/${id}`, {
      ...getLtiRequest,
      signal: ctrl.signal,
      onerror(err) {
        console.error(err);
        subscriber.error(new Error(err));
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

const globalCoherenceAnalysis = new BehaviorSubject<GlobalCoherenceData | null>(
  null
);
const keyPointsAnalysis = new BehaviorSubject<KeyPointsData | null>(null);
const allExpectationsAnalysis = new BehaviorSubject<AllExpectationsData | null>(
  null
);
const argumentsAnalysis = new BehaviorSubject<ArgumentsData | null>(null);
const ontopicAnalysis = new BehaviorSubject<OnTopicReviewData | null>(null);
review$
  .pipe(
    filter((rev) => typeof rev === 'object' && 'analysis' in rev),
    map((rev) => rev.analysis)
  )
  .subscribe((analyses) =>
    analyses.forEach((analysis) => {
      switch (analysis.tool) {
        // TODO add shape checks
        case 'global_coherence':
          globalCoherenceAnalysis.next(analysis);
          break;
        case 'key_points':
          keyPointsAnalysis.next(analysis);
          break;
        case 'all_expectations':
          allExpectationsAnalysis.next(analysis);
          break;
        case 'arguments':
          argumentsAnalysis.next(analysis);
          break;
        case 'ontopic':
          ontopicAnalysis.next(analysis);
          break;
      }
    })
  );

export const [useGlobalCoherenceData, globalCoherenceData$] = bind(
  globalCoherenceAnalysis,
  null
);
export const [useKeyPointsData, keyPointsData$] = bind(keyPointsAnalysis, null);
export const [useAllExpectationsAnalysis] = bind(allExpectationsAnalysis, null);
export const [useArgumentsData, argumentsData$] = bind(argumentsAnalysis, null);
export const [useOnTopicData, onTopicData$] = bind(ontopicAnalysis, null);
