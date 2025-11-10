import type { NotesRequest, TextRequest } from '../../lib/Requests';
import type { WritingTask } from '../../lib/WritingTask';
import { checkReviewResponse } from '../components/ErrorHandler/ErrorHandler';
import type {
  CopyEditResponse,
  LocalCoherenceResponse,
  SelectedText,
} from '../lib/ToolResults';

/*** Notes to Prose ***/

export async function postConvertNotes(
  { text }: SelectedText,
  output: 'prose' | 'bullets' = 'prose',
  writing_task?: WritingTask | null
): Promise<string> {
  const endpoint =
    output === 'bullets' ? 'convert_to_bullets' : 'convert_to_prose';
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes: text,
      user_lang,
      target_lang,
    } as NotesRequest),
  });
  if (!response.ok) {
    checkReviewResponse(response);
    // throw new Error(`HTTP error status: ${response.status}`, {
    //   cause: await response.json(),
    // });
  }
  const data = await response.json();
  if (typeof data === 'string') {
    return data;
  }
  // TODO fix this for server errors instead of openai errors.
  if ('error' in data) {
    console.error(data.message);
    return data.message;
  }
  // if ('choices' in data) {
  //   logCovertNotes(text, data);
  //   return data.choices[0].message.content ?? '';
  // }
  console.error(data);
  return '';
}

/*** Fix Grammar ***/

/*** Clarify selected text ***/

async function postText<
  T extends { explanation: string } | { general_assessment: string },
>(
  endpoint: string,
  errorData: T,
  { text }: SelectedText,
  writing_task?: WritingTask | null
): Promise<T> {
  const { user_lang, target_lang } = writing_task?.info ?? {};
  const response = await fetch(`/api/v2/scribe/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, user_lang, target_lang } as TextRequest),
  });
  if (!response.ok) {
    const err = await response.text();
    console.error(err);
    return { ...errorData, explanation: err };
  }
  const data = await response.json();
  if ('error' in data) {
    console.error(data.message);
    return { ...errorData, explanation: data.message };
  }
  // if ('choices' in data) {
  const content = data; // data.choices.at(0)?.message.content;
  if (content) {
    try {
      return content as T;
    } catch (err) {
      console.log(content);
      console.error(err);
      if (err instanceof Error) {
        return { ...errorData, explanation: err.message };
      }
    }
  }
  // }
  console.error(data);
  return { ...errorData, explanation: 'Invalid response from service.' };
}
export const postClarifyText = (
  selected: SelectedText,
  writing_task?: WritingTask | null
) =>
  postText<CopyEditResponse>(
    'copyedit',
    {
      revision: '',
      clean_revision: '',
      explanation: '',
    },
    selected,
    writing_task
  );

/*** Assess Expectations ***/

// const errorExpectationData: ExpectationData = {
//   rating: 0.0,
//   general_assessment: '',
//   issues: [],
// };

// export async function postExpectation(
//   text: string,
//   { name, description }: Rule,
//   writing_task?: WritingTask | null
// ): Promise<ExpectationData> {
//   const { user_lang, target_lang } = writing_task?.info ?? {};
//   const response = await fetch('/api/v2/scribe/assess_expectation', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       text,
//       user_lang,
//       target_lang,
//       expectation: name,
//       description,
//     } as AssessExpectationRequest),
//   });
//   if (!response.ok) {
//     const err = await response.text();
//     console.error(err);
//     // return { ...errorData, explanation: err };
//     return { ...errorExpectationData, general_assessment: err };
//   }
//   const data = await response.json();
//   if ('error' in data) {
//     console.error(data.message);
//     // return {
//     //   ...errorData,
//     //   explanation: data.message,
//     // };
//     return {
//       ...errorExpectationData,
//       general_assessment: data.message,
//     };
//   }
//   if ('choices' in data) {
//     const content = data.choices.at(0)?.message.content;
//     if (content) {
//       // return JSON.parse(content) as AssessmentData;
//       return JSON.parse(content) as ExpectationData;
//     }
//   }
//   console.error(data);
//   // return { ...errorData, explanation: 'Invalid respose from service.' };
//   return {
//     ...errorExpectationData,
//     general_assessment: 'Invalid respose from service.',
//   };
// }

/****** Logical Flow Audit ******/

export const postFlowText = (
  selected: SelectedText,
  writing_task?: WritingTask | null
) =>
  postText<LocalCoherenceResponse>(
    'local_coherence',
    {
      rating: 0,
      general_assessment: '',
      issues: [],
    },
    selected,
    writing_task
  );
