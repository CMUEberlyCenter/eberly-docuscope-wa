import { ExpectationsButton } from "#components/Review/Expectations";
import { LinesOfArgumentsButton } from "#components/Review/LinesOfArguments";
import { LogicalFlowButton } from "#components/Review/LogicalFlow";
import { ProminentTopicsButton } from "#components/Review/ProminentTopics";
import { TopicalProgressionButton } from "#components/Review/TopicalProgression";
import { isEnabled, WritingTask } from "#lib/WritingTask";
import { FC } from "react";
import { Tooltip } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/esm/OverlayTrigger";
import { Translation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";
import { ReviewButtonToolbar } from "./ReviewButtonToolbar";

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
  task?: Optional<WritingTask>;
  enabled?: string[];
}> = ({
  activeTool,
  onSelect,
  task,
  enabled = [
    "expectations",
    "logical_flow",
    "prominent_topics",
    "topical_progression",
  ],
}) => {
  const { settings } = usePageContext();
  return (
    <ReviewButtonToolbar>
      {settings?.expectations && (!task || isEnabled(task, "expectations")) ? (
        !task && enabled?.includes("expectations") ? (
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip>
                <Translation ns={["review", "instructions"]}>
                  {(t) => (
                    <>
                      {t("instructions:expectations_scope_note")}
                      <hr />
                      {t("review:expectations.no_writing_task_tooltip")}
                    </>
                  )}
                </Translation>
              </Tooltip>
            }
          >
            {/* div required to get tooltip overlay to work. */}
            <div>
              <ExpectationsButton disabled={true} />
            </div>
          </OverlayTrigger>
        ) : (
          <ExpectationsButton
            active={activeTool === "expectations"}
            disabled={enabled?.includes("expectations") === false}
            onClick={() => onSelect("expectations")}
          />
        )
      ) : null}
      {settings?.prominent_topics &&
      (!task || isEnabled(task, "prominent_topics")) ? (
        <ProminentTopicsButton
          disabled={enabled?.includes("prominent_topics") === false}
          active={activeTool === "prominent_topics"}
          onClick={() => onSelect("prominent_topics")}
        />
      ) : null}
      {settings?.lines_of_arguments && isEnabled(task, "lines_of_arguments") ? (
        <LinesOfArgumentsButton
          disabled={enabled?.includes("lines_of_arguments") === false}
          active={activeTool === "lines_of_arguments"}
          onClick={() => onSelect("lines_of_arguments")}
        />
      ) : null}
      {settings?.logical_flow && (!task || isEnabled(task, "logical_flow")) ? (
        <LogicalFlowButton
          disabled={enabled?.includes("logical_flow") === false}
          active={activeTool === "logical_flow"}
          onClick={() => onSelect("logical_flow")}
        />
      ) : null}
      {settings?.term_matrix && (!task || isEnabled(task, "term_matrix")) ? (
        <TopicalProgressionButton
          disabled={enabled?.includes("term_matrix") === false}
          active={activeTool === "topical_progression"}
          onClick={() => onSelect("topical_progression")}
        />
      ) : null}
    </ReviewButtonToolbar>
  );
};
