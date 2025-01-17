import { FC, HTMLProps, useContext, useId } from "react";
import { Translation, useTranslation } from "react-i18next";
import { useEthosData } from "../../service/review.service";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ErrorBoundary } from "react-error-boundary";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { SentenceAssessment } from "../../../lib/ReviewResponse";
import { AlertIcon } from "../AlertIcon/AlertIcon";

export const EthosTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        {/* TODO icon */} {t("ethos.entry")}
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

export const Ethos: FC = () => {
  const { t } = useTranslation("review");
  const { t: ti } = useTranslation("instructions");
  const review = useEthosData();

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("ethos.title")}</h4>
        <FadeContent htmlContent={ti("ethos")} />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("ethos.error")}</Alert>}
          >
            {"error" in review ? (
              <Alert variant="danger">
                {review.error.message}
                {/* TODO replace with general message in production */}
              </Alert>
            ) : null}
            {"response" in review ? (
              <>
                <h5>{t("ethos.expertise")}</h5>
                <SentenceAssessments
                  assessments={review.response.expertise_ethos}
                />
                <h5>{t("ethos.analytical")}</h5>
                <SentenceAssessments
                  assessments={review.response.analytical_ethos}
                />
                <h5>{t("ethos.ballanced")}</h5>
                <SentenceAssessments
                  assessments={review.response.balanced_ethos}
                />
              </>
            ) : (
              <Alert variant="warning">{t("ethos.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
