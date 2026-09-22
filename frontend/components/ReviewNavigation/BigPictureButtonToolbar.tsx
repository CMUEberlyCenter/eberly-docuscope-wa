import { ExpectationsButton } from "#components/Review/Expectations";
import { LinesOfArgumentsButton } from "#components/Review/LinesOfArguments";
import { LogicalFlowButton } from "#components/Review/LogicalFlow";
import { TopicalProgressionButton } from "#components/Review/TopicalProgression.js";
import { ProminentTopicsButton } from "#components/Review/ProminentTopics";
import { isEnabled, WritingTask } from "#lib/WritingTask";
import { FC } from "react";
import { ButtonToolbar } from "react-bootstrap";
import { usePageContext } from "vike-react/usePageContext";

// The big picture tools as referenced in the writing task database. The "term_matrix" tool is used for the "topical_progression" tool in the UI.
export type WritingTypeBigPictureTool =
  | "expectations"
  | "lines_of_arguments"
  | "logical_flow"
  | "prominent_topics"
  | "term_matrix";

export type BigPictureTool =
  | "expectations"
  | "lines_of_arguments"
  | "logical_flow"
  | "prominent_topics"
  | "topical_progression";

export const BigPictureButtonToolbar: FC<{
  activeTool: BigPictureTool | null;
  onSelect: (key: BigPictureTool) => void;
  task?: WritingTask;
  disabled?: (tool: WritingTypeBigPictureTool) => boolean;
}> = ({ activeTool, onSelect, task, disabled }) => {
  const { settings } = usePageContext();
  return (
    <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
      {settings?.expectations && isEnabled(task, "expectations") ? (
        <ExpectationsButton
          active={activeTool === "expectations"}
          disabled={disabled?.("expectations") ?? false}
          onClick={() => onSelect("expectations")}
        />
      ) : null}
      {settings?.prominent_topics && isEnabled(task, "prominent_topics") ? (
        <ProminentTopicsButton
          disabled={disabled?.("prominent_topics") ?? false}
          active={activeTool === "prominent_topics"}
          onClick={() => onSelect("prominent_topics")}
        />
      ) : null}
      {settings?.lines_of_arguments && isEnabled(task, "lines_of_arguments") ? (
        <LinesOfArgumentsButton
          disabled={disabled?.("lines_of_arguments") ?? false}
          active={activeTool === "lines_of_arguments"}
          onClick={() => onSelect("lines_of_arguments")}
        />
      ) : null}
      {settings?.logical_flow && isEnabled(task, "logical_flow") ? (
        <LogicalFlowButton
          disabled={disabled?.("logical_flow") ?? false}
          active={activeTool === "logical_flow"}
          onClick={() => onSelect("logical_flow")}
        />
      ) : null}
      {settings?.term_matrix && isEnabled(task, "term_matrix") ? (
        <TopicalProgressionButton
          disabled={disabled?.("term_matrix") ?? false}
          active={activeTool === "topical_progression"}
          onClick={() => onSelect("topical_progression")}
        />
      ) : null}
    </ButtonToolbar>
  );
};
