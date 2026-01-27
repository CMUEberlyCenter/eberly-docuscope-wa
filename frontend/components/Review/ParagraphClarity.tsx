import { type FC, type HTMLProps, useId } from "react";
import { Accordion, type ButtonProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Icon from "../../assets/icons/paragraph_clarity_icon.svg?react";
import { ParagraphClarityData } from "../../src/lib/ReviewResponse";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  ReviewToolCard,
  useReviewDispatch,
} from "../ReviewContext/ReviewContext";
import { createReviewDataContext } from "../ReviewContext/createReviewDataContext";
import { ToolButton } from "../ToolButton/ToolButton";

export const {
  ReviewDataProvider: ParagraphClarityReviewProvider,
  SnapshotDataProvider: ParagraphClaritySnapshotProvider,
  useReviewDataContext: useParagraphClarityReview,
} = createReviewDataContext<ParagraphClarityData>("paragraph_clarity");

/** Button component for selecting the Paragraph Clarity tool. */
export const ParagraphClarityButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:paragraph_clarity.title")}
      tooltip={t("instructions:paragraph_clarity_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Paragraph Clarity review tool component. */
export const ParagraphClarity: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } = useParagraphClarityReview();
  const { t } = useTranslation("review");
  const id = useId();
  const dispatch = useReviewDispatch();
  return (
    <ReviewToolCard
      title={t("paragraph_clarity.title")}
      instructionsKey={"paragraph_clarity"}
      errorMessage={t("paragraph_clarity.error")}
      review={review}
      isPending={pending}
      {...props}
    >
      <section>
        <header>
          <h5 className="text-primary">{t("insights")}</h5>
          <Translation ns="instructions">
            {(t) => <p>{t("paragraph_clarity_insights")}</p>}
          </Translation>
        </header>
        {review && "response" in review ? (
          <Accordion>
            {review.response.map(
              ({ issue, suggestion, sent_ids, para_id }, i) => (
                <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                  <Accordion.Header className="accordion-header-highlight">
                    <div className="flex-grow-1">{issue}</div>
                    <AlertIcon
                      show={sent_ids.length === 0 && !para_id}
                      message={t("logical_flow.no_sentences")}
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [sent_ids],
                        paragraphs: [para_id],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    <h6 className="d-inline">
                      {t("paragraph_clarity.suggestion")}
                    </h6>{" "}
                    <p className="d-inline">{suggestion}</p>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        ) : null}
      </section>
    </ReviewToolCard>
  );
};
