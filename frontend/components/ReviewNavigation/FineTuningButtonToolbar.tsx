import { ParagraphClarityButton } from "#components/Review/ParagraphClarity";
import { ProfessionalToneButton } from "#components/Review/ProfessionalTone";
import { SentencesButton } from "#components/Review/Sentences";
import { SourcesButton } from "#components/Review/Sources";
import { isEnabled, WritingTask } from "#lib/WritingTask";
import { FC } from "react";
import { ButtonToolbar } from "react-bootstrap";
import { usePageContext } from "vike-react/usePageContext";

export type WritingTaskFineTuning =
  "paragraph_clarity" | "sentence_density" | "professional_tone" | "sources";
export type FineTuningTool =
  "paragraph_clarity" | "sentence_clarity" | "professional_tone" | "sources";

export const FineTuningButtonToolbar: FC<{
  activeTool: FineTuningTool | null;
  onSelect: (key: FineTuningTool) => void;
  task?: WritingTask;
  disabled: (tool: WritingTaskFineTuning) => boolean;
}> = ({ activeTool, onSelect, task, disabled }) => {
  const { settings } = usePageContext();
  return (
    <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
      {settings?.paragraph_clarity && isEnabled(task, "paragraph_clarity") ? (
        <ParagraphClarityButton
          disabled={disabled("paragraph_clarity")}
          active={activeTool === "paragraph_clarity"}
          onClick={() => onSelect("paragraph_clarity")}
        />
      ) : null}
      {settings?.sentence_density && isEnabled(task, "sentence_density") ? (
        <SentencesButton
          disabled={disabled("sentence_density")}
          active={activeTool === "sentence_clarity"}
          onClick={() => onSelect("sentence_clarity")}
        />
      ) : null}
      {settings?.professional_tone && isEnabled(task, "professional_tone") ? (
        <ProfessionalToneButton
          disabled={disabled("professional_tone")}
          active={activeTool === "professional_tone"}
          onClick={() => onSelect("professional_tone")}
        />
      ) : null}
      {settings?.sources && isEnabled(task, "sources") ? (
        <SourcesButton
          disabled={disabled("sources")}
          active={activeTool === "sources"}
          onClick={() => onSelect("sources")}
        />
      ) : null}
    </ButtonToolbar>
  );
};
