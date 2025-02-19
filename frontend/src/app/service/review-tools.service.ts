import { bind } from '@react-rxjs/core';
import { combineLatest, map } from 'rxjs';
import { isEnabled, isWritingTask, WritingTask } from '../../lib/WritingTask';
import {
  globalFeatureCivilTone$,
  globalFeatureEthos$,
  globalFeatureExpectations$,
  globalFeatureKeyIdeas$,
  globalFeatureLinesOfArguments$,
  globalFeatureLogicalFlow$,
  globalFeaturePathos$,
  globalFeatureProfessionalTone$,
  globalFeatureSources$,
  globalFeatureTermMatrix$,
} from './settings.service';
import { writingTask$ } from './writing-task.service';
import { ReviewTool } from '../../lib/ReviewResponse';

const existsEnabled = (task: WritingTask | null, key: ReviewTool) =>
  isWritingTask(task) && isEnabled(task, key);

export const [useArgumentsEnabled, argumentsEnabled$] = bind(
  combineLatest([globalFeatureLinesOfArguments$, writingTask$]).pipe(
    map(
      ([settings, task]) =>
        settings && existsEnabled(task, 'lines_of_arguments')
    )
  ),
  false
);

export const [useCivilToneEnabled, civilToneEnabled$] = bind(
  combineLatest([globalFeatureCivilTone$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'civil_tone'))
  ),
  false
);

export const [useEthosEnabled, ethosEnabled$] = bind(
  combineLatest([globalFeatureEthos$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'ethos'))
  ),
  false
);

export const [useExpectationsEnabled, expectationsEnabled$] = bind(
  combineLatest([globalFeatureExpectations$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'expectations'))
  ),
  false
);

export const [useKeyIdeasEnabled, keyIdeasEnabled$] = bind(
  combineLatest([globalFeatureKeyIdeas$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'key_ideas'))
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

export const [usePathosEnabled, pathosEnabled$] = bind(
  combineLatest([globalFeaturePathos$, writingTask$]).pipe(
    map(([settings, task]) => settings && existsEnabled(task, 'pathos'))
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
