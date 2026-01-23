import {
  useId,
  type FC,
  type HTMLProps
} from "react";
import { Accordion } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import {
  type CivilToneData
} from "../../src/lib/ReviewResponse";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReview,
  useReviewDispatch,
  useSnapshotReview,
} from "./ReviewContext";

const CivilToneContent: FC<ReviewToolContentProps<CivilToneData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");
  const id = useId();
  const dispatch = useReviewDispatch();
  return (
    <ReviewToolCard
      title={t("civil_tone.title")}
      instructionsKey={"civil_tone"}
      errorMessage={t("civil_tone.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("civil_tone_insights")}</p>}
            </Translation>
          </header>
          {review.response.length ? (
            <Accordion>
              {review.response.map(
                ({ text, assessment, suggestion, sent_id }, i) => (
                  <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                    <Accordion.Header className="accordion-header-highlight">
                      <h6 className="d-inline">{t("civil_tone.prefix")}</h6>{" "}
                      <q>{text}</q>
                    </Accordion.Header>
                    <Accordion.Body
                      className="pb-3"
                      onEntered={() =>
                        dispatch({
                          type: "set",
                          sentences: [[sent_id]],
                        })
                      }
                      onExit={() => dispatch({ type: "unset" })}
                    >
                      <div>
                        <h6 className="d-inline">{t("civil_tone.issue")}</h6>{" "}
                        <p className="d-inline">{assessment}</p>
                      </div>
                      <div>
                        <h6 className="d-inline">
                          {t("civil_tone.suggestion")}
                        </h6>{" "}
                        <p className="d-inline">{suggestion}</p>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                )
              )}
            </Accordion>
          ) : (
            <div className="alert alert-info">{t("civil_tone.null")}</div>
          )}
        </section>
      ) : null}
    </ReviewToolCard>
  );
};

/** Civil Tone review tool component. */
export const CivilTone: FC<HTMLProps<HTMLDivElement>> = ({ ...props }) => {
  const { pending, review } = useReview<CivilToneData>("civil_tone");

  return (
    <CivilToneContent
      isPending={pending}
      review={review}
      {...props}
    />
  );
};

/** Civil Tone preview component. */
export const CivilTonePreview: FC<PreviewCardProps<CivilToneData>> = ({
  analysis,
  reviewID,
  ...props
}) => {
  const { review, pending } = useSnapshotReview<CivilToneData>(
    "civil_tone",
    reviewID,
    analysis
  );

  return (
    <CivilToneContent
      isPending={pending}
      review={review}
      {...props}
    />
  );
};
