import { type FC, type HTMLProps, useId } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import {
  ReviewToolCard,
  useReviewDispatch,
} from "../ReviewContext/ReviewContext";
import { createReviewDataContext } from "../ReviewContext/createReviewDataContext";
import { CredibilityData } from "../../src/lib/ReviewResponse";

export const {
  ReviewDataProvider: CredibilityReviewProvider,
  SnapshotDataProvider: CredibilitySnapshotProvider,
  useReviewDataContext: useCredibilityReview,
} = createReviewDataContext<CredibilityData>("credibility");

/** Ethos review tool component. */
export const Credibility: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { t } = useTranslation("review");
  const { review, pending } = useCredibilityReview();
  const dispatch = useReviewDispatch();
  const prefix = useId();
  return (
    <ReviewToolCard
      title={t("credibility.title")}
      instructionsKey={"credibility"}
      errorMessage={t("credibility.error")}
      review={review}
      isPending={pending}
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
