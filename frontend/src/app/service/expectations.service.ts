import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ExpectationsData } from '../../lib/ReviewResponse';
import { isWritingTask } from '../../lib/WritingTask';
import { isReview, Review } from '../../server/model/review';
import { getLtiRequest } from './lti.service';
import { writingTask } from './writing-task.service';

const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');

export const [useExpectations, expectations$] = bind<SUSPENSE | Review>(
  new Observable((subscriber) => {
    subscriber.next(SUSPENSE);
    const ctrl = new AbortController();
    fetchEventSource(`/api/v2/reviews/${id}/expectations`, {
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

expectations$.subscribe((rev) => {
  if (isReview(rev)) {
    writingTask.next(isWritingTask(rev.writing_task) ? rev.writing_task : null);
  }
});
const allExpectationsAnalysis = new BehaviorSubject<Map<
  string,
  ExpectationsData
> | null>(null);
expectations$.subscribe((rev) => {
  if (isReview(rev)) {
    const expectations = new Map(
      rev.analysis
        .filter((a) => a.tool === 'all_expectations')
        .map((exp) => [exp.expectation, exp])
    );
    allExpectationsAnalysis.next(expectations);
  }
});

export const [useAllExpectationsAnalysis] = bind(allExpectationsAnalysis, null);
