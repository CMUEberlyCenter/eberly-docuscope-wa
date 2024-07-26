import { fetchEventSource } from '@microsoft/fetch-event-source';
import { bind, SUSPENSE } from '@react-rxjs/core';
import { catchError, concat, Observable, of, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { isWritingTask } from '../../lib/WritingTask';
import { Review } from '../../server/model/review';
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
        console.log(msg);
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

export const [useReviewo, reviewo$] = bind<SUSPENSE | Review | null>(
  concat(
    of(SUSPENSE),
    fromFetch(`/api/v2/reviews/${id}`, { ...getLtiRequest }).pipe(
      switchMap(async (response: Response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        // check for form
        console.log('got review');
        const review = (await response.json()) as Review;
        console.log(review);
        return review;
        // return (await response.json()) as Review;
      }),
      catchError(() => of(null))
    )
  ),
  SUSPENSE
);

review$.subscribe((rev) => {
  if (typeof rev === 'object') {
    writingTask.next(
      isWritingTask(rev?.writing_task) ? rev.writing_task : null
    );
  }
});
