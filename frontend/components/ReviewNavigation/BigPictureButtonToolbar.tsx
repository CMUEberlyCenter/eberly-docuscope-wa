import { ExpectationsButton } from "#components/Review/Expectations";
import { LinesOfArgumentsButton } from "#components/Review/LinesOfArguments";
import { LogicalFlowButton } from "#components/Review/LogicalFlow";
import { OrganizationButton } from "#components/Review/Organization";
import { ProminentTopicsButton } from "#components/Review/ProminentTopics";
import { isEnabled, WritingTask } from "#lib/WritingTask";
import { FC } from "react";
import { ButtonToolbar } from "react-bootstrap";
import { usePageContext } from "vike-react/usePageContext";

export type BigPictureTool =
  | "expectations"
  | "prominent_topics"
  | "lines_of_arguments"
  | "logical_flow"
  | "term_matrix"
  | "organization";

export const BigPictureButtonToolbar: FC<{
  activeTool: BigPictureTool | null;
  onSelect: (key: BigPictureTool) => void;
  task?: WritingTask;
  disabled?: (tool: BigPictureTool) => boolean;
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
        <OrganizationButton
          disabled={disabled?.("term_matrix") ?? false}
          active={activeTool === "organization"}
          onClick={() => onSelect("organization")}
        />
      ) : null}
    </ButtonToolbar>
  );
};
