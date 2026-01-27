import { type FC, type HTMLProps, useId } from "react";
import { Accordion, type ButtonProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Icon from "../../assets/icons/global_coherence_icon.svg?react";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  ReviewToolCard,
  useReviewDispatch,
} from "../ReviewContext/ReviewContext";
import { createReviewDataContext } from "../ReviewContext/createReviewDataContext";
import { ToolButton } from "../ToolButton/ToolButton";
import { LogicalFlowData } from "../../src/lib/ReviewResponse";

export const {
  ReviewDataProvider: LogicalFlowReviewProvider,
  SnapshotDataProvider: LogicalFlowSnapshotProvider,
  useReviewDataContext: useLogicalFlowReview,
} = createReviewDataContext<LogicalFlowData>("logical_flow");

/** Button component for selecting the Logical Flow tool. */
export const LogicalFlowButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:logical_flow.title")}
      tooltip={t("instructions:logical_flow_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Logical Flow review tool component. */
export const LogicalFlow: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } = useLogicalFlowReview();
  const { t } = useTranslation("review");
  const id = useId();
  const dispatch = useReviewDispatch();
  return (
    <ReviewToolCard
      title={t("logical_flow.title")}
      instructionsKey={"logical_flow"}
      errorMessage={t("logical_flow.error")}
      review={review}
      isPending={pending}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("logical_flow_insights")}</p>}
            </Translation>
          </header>
          <Accordion>
            {review.response.map(
              ({ issue, suggestion, sent_ids, para_ids }, i) => (
                <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                  <Accordion.Header className="accordion-header-highlight">
                    <div className="flex-grow-1">
                      <h6 className="d-inline">{t("logical_flow.issue")}</h6>{" "}
                      <span>{issue}</span>
                    </div>
                    <AlertIcon
                      show={sent_ids.length + para_ids.length === 0}
                      message={t("logical_flow.no_sentences")}
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [sent_ids],
                        paragraphs: para_ids,
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    <h6 className="d-inline">{t("logical_flow.suggestion")}</h6>{" "}
                    <p className="d-inline">{suggestion}</p>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        </section>
      ) : null}
    </ReviewToolCard>
  );
};
