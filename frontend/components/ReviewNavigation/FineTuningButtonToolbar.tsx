import { ParagraphClarityButton } from "#components/Review/ParagraphClarity";
import { ProfessionalToneButton } from "#components/Review/ProfessionalTone";
import { SentencesButton } from "#components/Review/Sentences";
import { SourcesButton } from "#components/Review/Sources";
import { isEnabled, WritingTask } from "#lib/WritingTask";
import { FC } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { ReviewButtonToolbar } from "./ReviewButtonToolbar";

export type WritingTaskFineTuning =
  "paragraph_clarity" | "sentence_density" | "professional_tone" | "sources";
export type FineTuningTool =
  "paragraph_clarity" | "sentence_clarity" | "professional_tone" | "sources";

export const FineTuningButtonToolbar: FC<{
  activeTool: FineTuningTool | null;
  onSelect: (key: FineTuningTool) => void;
  task?: Optional<WritingTask>;
  enabled?: string[];
}> = ({
  activeTool,
  onSelect,
  task,
  enabled = [
    "paragraph_clarity",
    "sentence_density",
    "professional_tone",
    "sources",
  ],
}) => {
  const { settings } = usePageContext();
  return (
    <ReviewButtonToolbar>
      {settings?.paragraph_clarity &&
      (!task || isEnabled(task, "paragraph_clarity")) ? (
        <ParagraphClarityButton
          disabled={enabled?.includes("paragraph_clarity") === false}
          active={activeTool === "paragraph_clarity"}
          onClick={() => onSelect("paragraph_clarity")}
        />
      ) : null}
      {settings?.sentence_density &&
      (!task || isEnabled(task, "sentence_density")) ? (
        <SentencesButton
          disabled={enabled?.includes("sentence_density") === false}
          active={activeTool === "sentence_clarity"}
          onClick={() => onSelect("sentence_clarity")}
        />
      ) : null}
      {settings?.professional_tone &&
      (!task || isEnabled(task, "professional_tone")) ? (
        <ProfessionalToneButton
          disabled={enabled?.includes("professional_tone") === false}
          active={activeTool === "professional_tone"}
          onClick={() => onSelect("professional_tone")}
        />
      ) : null}
      {settings?.sources && (!task || isEnabled(task, "sources")) ? (
        <SourcesButton
          disabled={enabled?.includes("sources") === false}
          active={activeTool === "sources"}
          onClick={() => onSelect("sources")}
        />
      ) : null}
    </ReviewButtonToolbar>
  );
};
