import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, SentenceAssessment } from "../../../lib/ReviewResponse";
import { usePathosData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const PathosTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns="review">
    {(t) => (
      <span {...props}>
        {/* TODO icon */} {t("pathos.entry")}
      </span>
    )}
  </Translation>
);

const SentenceAssessments: FC<
  AccordionProps & { assessments?: SentenceAssessment[] }
> = ({ assessments, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const prefix = useId();
  return (
    <Translation ns="review">
      {(t) =>
        assessments?.length ? (
          <Accordion {...props}>
            {assessments.map(({ sentence_ids, assessment, suggestion }, i) => (
              <Accordion.Item
                key={`${prefix}-${i}`}
                eventKey={`${prefix}-${i}`}
              >
                <Accordion.Header className="accordion-header-highlight">
                  <div className="fex-grow-1">
                    <h6 className="d-inline">{t("ethos.assessment")}</h6>{" "}
                    <span>{assessment}</span>
                  </div>
                  <AlertIcon
                    message={t("ethos.no_sentences")}
                    show={sentence_ids.length === 0}
                  />
                </Accordion.Header>
                <Accordion.Body
                  className="p-0 pb-3"
                  onEntered={() =>
                    dispatch({
                      type: "set",
                      sentences: [sentence_ids],
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
          <Alert variant="warning">{t("ethos.null")}</Alert>
        )
      }
    </Translation>
  );
};

export const Pathos: FC = () => {
  const { t } = useTranslation("review");
  const review = usePathosData();

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("pathos.title")}</h4>
      </div>
      <Translation ns="instructions">
        {(t) => <FadeContent htmlContent={t("pathos")} />}
      </Translation>
      {!review ? (
        <Loading />
      ) : (
        <ErrorBoundary
          fallback={<Alert variant="danger">{t("pathos.error")}</Alert>}
        >
          {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
          {"response" in review ? (
            <>
              <h5>{t("pathos.situation")}</h5>
              <SentenceAssessments
                assessments={review.response.situation_pathos}
              />
              <h5>{t("pathos.temporal")}</h5>
              <SentenceAssessments
                assessments={review.response.temporal_pathos}
              />
              <h5>{t("pathos.immersive")}</h5>
              <SentenceAssessments
                assessments={review.response.immersive_pathos}
              />
              <h5>{t("pathos.structural")}</h5>
              <SentenceAssessments
                assessments={review.response.structural_pathos}
              />
            </>
          ) : null}
        </ErrorBoundary>
      )}
    </ReviewReset>
  );
};
