import { bind } from '@react-rxjs/core';
import { of } from 'rxjs';
import tagged from '../data/tagger.json';

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
}
export const [useTaggerResults, taggerResults$] = bind(of(tagged as TaggerResults), null);
