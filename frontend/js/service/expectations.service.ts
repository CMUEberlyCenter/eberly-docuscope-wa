/**
 * @fileoverview Runtime rules loader.
 *
 * Reads the "assets/rules.json" file which can be easily replaced in
 * various environments.
 */
import { bind } from '@react-rxjs/core';
import { catchError, of, shareReplay } from 'rxjs';
import { ajax } from 'rxjs/ajax';

// URL for rules.json, 'base' gets it to work with webpack.
const RULES_URL = new URL('../assets/rules.json', import.meta.url);

// Defines the form of the json.
interface RuleTopic {
  lemma: string;
  user_defined: boolean;
  prompt: string;
  no_lexical_overlap: boolean;
}
export interface ExpectationRule {
  name: string;
  description: string;
  topics: RuleTopic[];
  experiences: string[];
  examples: string;
  type: string;
  is_group: boolean;
  children: ExpectationRule[];
  cv_description: string;
  values: string[];
  parent: string | null;
}
export interface ExpectationRules {
  name: string;
  rules: ExpectationRule[];
}

// useExpectations: for use in a component, expectations$: the rxjs observable
export const [useExpectations, expectations$] = bind(
  ajax.getJSON<ExpectationRules>(RULES_URL.toString()).pipe(
    //map((data) => ({ ...data })),
    shareReplay(1),
    catchError((err) => {
      console.warn(`Failed to load Expectations rules: ${err}`);
      return of({
        name: 'Error loading Expectation rules.',
        rules: [],
      } as ExpectationRules);
    })
  ),
  { name: 'Loading Expectation rules.', rules: [] } as ExpectationRules
);
