import { FC, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, SentenceAssessment } from "../../../lib/ReviewResponse";
import { useEthosData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

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
                  className="pb-3"
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
  // credibility
  const { t } = useTranslation("review");
  const review = useEthosData();

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto d-flex flex-column flex-grow-1">
        <ToolHeader title={t("ethos.title")} instructionsKey="ethos" />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("ethos.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("ethos_insights")}</p>}
                  </Translation>
                </header>
                <section>
                  <h5>{t("ethos.expertise")}</h5>
                  <SentenceAssessments
                    assessments={review.response.expertise_ethos}
                  />
                </section>
                <section>
                  <h5>{t("ethos.analytical")}</h5>
                  <SentenceAssessments
                    assessments={review.response.analytical_ethos}
                  />
                </section>
                <section>
                  <h5>{t("ethos.balanced")}</h5>
                  <SentenceAssessments
                    assessments={review.response.balanced_ethos}
                  />
                </section>
              </section>
            ) : (
              <Alert variant="warning">{t("ethos.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
