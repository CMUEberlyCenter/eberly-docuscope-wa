import { bind } from '@react-rxjs/core';
import { combineLatest, map } from 'rxjs';
import type { ReviewTool } from '../../lib/ReviewResponse';
import { isEnabled, isWritingTask, type WritingTask } from '../../lib/WritingTask';
import {
  globalFeatureCivilTone$,
  globalFeatureCredibility$,
  globalFeatureExpectations$,
  globalFeatureLinesOfArguments$,
  globalFeatureLogicalFlow$,
  globalFeatureProfessionalTone$,
  globalFeatureProminentTopics$,
  globalFeatureSources$,
  globalFeatureTermMatrix$,
} from './settings.service';
import { writingTask$ } from './writing-task.service';

const existsEnabled = (task: WritingTask | null, key: ReviewTool) =>
  isWritingTask(task) && isEnabled(task, key);

export const [useCivilToneEnabled, civilToneEnabled$] = bind(
  combineLatest([globalFeatureCivilTone$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'civil_tone'))
  ),
  false
);
export const [useCredibilityEnabled, credibilityEnabled$] = bind(
  combineLatest([globalFeatureCredibility$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'credibility'))
  ),
  false
);
export const [useExpectationsEnabled, expectationsEnabled$] = bind(
  combineLatest([globalFeatureExpectations$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'expectations'))
  ),
  false
);
export const [useArgumentsEnabled, argumentsEnabled$] = bind(
  combineLatest([globalFeatureLinesOfArguments$, writingTask$]).pipe(
    map(
      ([settings, task]) =>
        settings && existsEnabled(task, 'lines_of_arguments')
    )
  ),
  false
);

export const [useLogicalFlowEnabled, logicalFlowEnabled$] = bind(
  combineLatest([globalFeatureLogicalFlow$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'logical_flow'))
  ),
  false
);

export const [useParagraphClarityEnabled, paragraphClarityEnabled$] = bind(
  combineLatest([globalFeatureCivilTone$, writingTask$]).pipe(
    map(
      ([settings, task]) => settings && existsEnabled(task, 'paragraph_clarity')
    )
  ),
  false
);

export const [useProfessionalToneEnabled, professionalToneEnabled$] = bind(
  combineLatest([globalFeatureProfessionalTone$, writingTask$]).pipe(
    map(
      ([settings, task]) => settings && existsEnabled(task, 'professional_tone')
    )
  ),
  false
);
export const [useProminentTopicsEnabled, prominentTopicsEnabled$] = bind(
  combineLatest([globalFeatureProminentTopics$, writingTask$]).pipe(
    map(
      ([settings, task]) => settings && existsEnabled(task, 'prominent_topics')
    )
  ),
  false
);

export const [useSourcesEnabled, sourcesEnabled$] = bind(
  combineLatest([globalFeatureSources$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'sources'))
  ),
  false
);

export const [useTermMatrixEnabled, termMatrixEnabled$] = bind(
  combineLatest([globalFeatureTermMatrix$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'term_matrix'))
  ),
  false
);

export const [useSentenceDensityEnabled, sentenceDensityEnabled$] = bind(
  combineLatest([globalFeatureCivilTone$, writingTask$]).pipe(
    map(
      ([settings, task]) => settings && existsEnabled(task, 'sentence_density')
    )
  ),
  false
);

export const [useImpressionsEnabled, impressionsEnabled$] = bind(
  combineLatest([globalFeatureCivilTone$, writingTask$]).pipe(
    map(([settings, task]) => settings && !!task && false)
  ),
  false
);

export const [useBigPictureEnabled, bigPictureEnabled$] = bind(
  combineLatest([
    expectationsEnabled$,
    argumentsEnabled$,
    prominentTopicsEnabled$,
    logicalFlowEnabled$,
  ]).pipe(map((big) => big.some(Boolean))),
  false
);

export const [useAdditionalToolsEnabled, additionalToolsEnabled$] = bind(
  combineLatest([
    civilToneEnabled$,
    credibilityEnabled$,
    sourcesEnabled$,
    termMatrixEnabled$,
    impressionsEnabled$,
  ]).pipe(map((addl) => addl.some(Boolean))),
  false
);

export const [useFineTuningEnabled, fineTuningEnabled$] = bind(
  combineLatest([
    additionalToolsEnabled$,
    paragraphClarityEnabled$,
    sentenceDensityEnabled$,
    professionalToneEnabled$,
  ]).pipe(map((fine) => fine.some(Boolean))),
  false
);
