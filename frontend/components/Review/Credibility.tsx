import { type FC, type HTMLProps, useId } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import { type CredibilityData } from "../../src/lib/ReviewResponse";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReview,
  useReviewDispatch,
  useSnapshotReview,
} from "./ReviewContext";

const CredibilityContent: FC<ReviewToolContentProps<CredibilityData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");
  const dispatch = useReviewDispatch();
  const prefix = useId();
  return (
    <ReviewToolCard
      title={t("credibility.title")}
      instructionsKey={"credibility"}
      errorMessage={t("credibility.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("credibility_insights")}</p>}
            </Translation>
          </header>
          <section>
            {review.response?.length ? (
              <Accordion>
                {review.response.map(({ issue, suggestion, sent_ids }, i) => (
                  <Accordion.Item
                    key={`${prefix}-${i}`}
                    eventKey={`${prefix}-${i}`}
                  >
                    <Accordion.Header className="accordion-header-highlight">
                      <div className="fex-grow-1">
                        <h6 className="d-inline">
                          {t("credibility.assessment")}
                        </h6>{" "}
                        <span>{issue}</span>
                      </div>
                      <AlertIcon
                        message={t("credibility.no_sentences")}
                        show={sent_ids.length === 0}
                      />
                    </Accordion.Header>
                    <Accordion.Body
                      className="pb-3"
                      onEntered={() =>
                        dispatch({
                          type: "set",
                          sentences: [sent_ids],
                        })
                      }
                      onExit={() => dispatch({ type: "unset" })}
                    >
                      {suggestion}
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            ) : (
              <Alert variant="warning">{t("credibility.null")}</Alert>
            )}
          </section>
        </section>
      ) : (
        <Alert variant="warning">{t("credibility.null")}</Alert>
      )}
    </ReviewToolCard>
  );
};
/** Ethos review tool component. */
export const Credibility: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } = useReview<CredibilityData>("credibility");

  return <CredibilityContent isPending={pending} review={review} {...props} />;
};

/** Ethos preview tool component. */
export const CredibilityPreview: FC<PreviewCardProps<CredibilityData>> = ({
  reviewID,
  analysis,
  ...props
}) => {
  const { review, pending } = useSnapshotReview<CredibilityData>(
    "credibility",
    reviewID,
    analysis
  );

  return <CredibilityContent isPending={pending} review={review} {...props} />;
};
