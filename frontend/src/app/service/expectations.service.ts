// import { fetchEventSource } from '@microsoft/fetch-event-source';
// import { bind, SUSPENSE } from '@react-rxjs/core';
// import { Observable } from 'rxjs';
// import { isWritingTask } from '../../lib/WritingTask';
// import { isReview, type Review } from '../../server/model/review';
// import { getLtiRequest } from './lti.service';
// import { writingTask } from './writing-task.service';

// const searchParams = new URLSearchParams(window.location.search);
// const id = searchParams.get('id');

// export const [useExpectations, expectations$] = bind<SUSPENSE | Review>(
//   new Observable((subscriber) => {
//     subscriber.next(SUSPENSE);
//     const ctrl = new AbortController();
//     fetchEventSource(`/api/v2/reviews/${id}/expectations`, {
//       ...getLtiRequest,
//       signal: ctrl.signal,
//       onerror(err) {
//         console.error(err);
//         subscriber.error(new Error(err));
//       },
//       onmessage(msg) {
//         subscriber.next(JSON.parse(msg.data));
//       },
//       onclose() {
//         subscriber.complete();
//       },
//     });
//     return () => ctrl.abort();
//   }),
//   SUSPENSE
// );

// expectations$.subscribe((rev) => {
//   if (isReview(rev)) {
//     writingTask.next(isWritingTask(rev.writing_task) ? rev.writing_task : null);
//   }
// });
