import { bind } from '@react-rxjs/core';
import { catchError, filter, Observable, of, switchMap } from 'rxjs';
import { editorState$, editorText } from './editor-state.service';

interface PatternData {
  pattern: string;
  count: number;
}
interface PatternCategoryData {
  category: string;
  patterns: PatternData[];
}
export interface TaggerResults {
  doc_id: string;
  word_count: number;
  html_content: string;
  tagging_time: number;
  patterns: PatternCategoryData[];
  isError?: boolean;
}
const EmptyResults: TaggerResults = {
  doc_id: '',
  word_count: 0,
  html_content: '',
  tagging_time: 0,
  patterns: [],
}
export function gen_patterns_map(
  res: TaggerResults
): Map<string, PatternData[]> {
  return new Map<string, PatternData[]>(
    res.patterns.map((d) => [d.category, d.patterns ?? []])
  );
}

interface Message {
  doc_id?: string;
  status: string;
}

export function tag(text: string) {
  return new Observable<TaggerResults | number>(subscriber => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:8088/tag', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    let position = 0;
    xhr.addEventListener('progress', (ev) => {
      if (!xhr) return;
      if (xhr.status !== 200) {
        console.error(ev);
        subscriber.error(xhr.responseText);
        return;
      }
      //console.log(xhr.responseText);
      const data = xhr.responseText.substring(position);
      //console.log(data);
      position += data.length;
      let chunk = '';
      //let evId: string | null = null;
      //let evRetry: string | null = null;
      let evData = '';
      let evEvent = 'message';
      data.split(/(\r\n|\r|\n){2}/g).forEach((part) => {
        if (part.trim().length === 0) {
          // process chunk
          if (chunk && chunk.length > 0) {
            chunk.split(/\n|\r\n|\r/).forEach((line) => {
              line = line.trimEnd();
              const index = line.indexOf(':');
              if (index <= 0 || index > 8) {
                // ignore non-fields or garbage
                return;
              }
              const field = line.substring(0, index);
              const value = line.substring(index + 1).trimStart();
              switch (field) {
                case 'data':
                  evData += value;
                  break;
                case 'id':
                case 'retry':
                  break;
                case 'event':
                  evEvent = value;
                  break;
                default:
                  console.warn(`Unhandled field for ${evEvent}: ${field}`);
                  return;
              }
            });
          }
          chunk = '';
        } else {
          chunk += part;
        }
      });
      try {
        switch (evEvent) {
          case 'processing': {
            const proc: Message = JSON.parse(evData);
            subscriber.next(parseFloat(proc.status));
            break;
          }
          case 'done': {
            if (evData) { // Needed to prevent weird parsing errors.
              const payload: TaggerResults = JSON.parse(evData);
              subscriber.next(payload);
            }
            break;
          }
          case 'error':
            subscriber.error(evData);
            break;
          case 'message':
            break;
          case 'submitted': // Unused in this context.
          case 'pending':
          default:
            console.warn(`Unhandled event: ${evEvent}`);
        }
      } catch (err) {
        subscriber.error(err);
      }
    });
    xhr.addEventListener('error', () => {
      subscriber.error(new Error('Tagger is unavailable.'));
    });
    xhr.addEventListener('load', () => subscriber.complete());
    xhr.addEventListener('abort', () => subscriber.complete());
    xhr.send(JSON.stringify({ text: text }));
    return () => xhr.abort();
  });
}

const tagEditorText = editorState$.pipe(
  filter(o => !o),
  switchMap(() => editorText.pipe(
    filter(txt => txt.trim().length > 0),
    switchMap((text: string) => tag(text))
  )),
  catchError((err: Error) =>
    of({...EmptyResults, ...{isError: true, html_content: err.message}}))
);

export const [useTaggerResults, taggerResults$] = bind(
  tagEditorText,
  null
);
