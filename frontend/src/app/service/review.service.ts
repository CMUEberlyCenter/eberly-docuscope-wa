import { bind, SUSPENSE } from "@react-rxjs/core"
import { fromFetch } from "rxjs/fetch"
import { getLtiRequest } from "./lti.service";
import { catchError, concat, filter, of, switchMap, tap } from "rxjs";
import { Review } from '../../server/model/review';
import { writingTask } from "./writing-task.service";
import { isWritingTask } from "../../lib/WritingTask";

const searchParams = new URLSearchParams(window.location.search);
const id = searchParams.get('id');
export const [useReview, review$] = bind<SUSPENSE | Review | null>(
  concat(
    of(SUSPENSE),
    fromFetch(`/api/v2/reviews/${id}`, { ...getLtiRequest }).pipe(
      switchMap(async (response: Response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        // check for form
        console.log('got review');
        const review = await response.json() as Review;
        console.log(review);
        return review;
        // return (await response.json()) as Review;
      }),
      catchError(() => of(null))
    ),
  ),
  SUSPENSE
);

review$.subscribe(rev => {
  console.log(rev);
   if(typeof rev === 'object') {
    console.log(isWritingTask(rev?.writing_task));
    writingTask.next(isWritingTask(rev?.writing_task) ? rev.writing_task : null);
  }
})
writingTask.subscribe(console.log);