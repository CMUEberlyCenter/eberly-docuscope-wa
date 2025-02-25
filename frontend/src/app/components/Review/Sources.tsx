import { FC, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Citation, isErrorData } from "../../../lib/ReviewResponse";
import { useSourcesData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

const Citations: FC<AccordionProps & { citations: Citation[] }> = ({
  citations,
  ...props
}) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();
  const { t } = useTranslation("review");

  return (
    <Accordion {...props}>
      {citations.map(({ names, assessment, sentences }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">
              <strong className="d-inline">{t("sources.source")}</strong>{" "}
              <span>{names}</span>
            </div>
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [sentences] })}
            onExit={() => dispatch({ type: "unset" })}
          >
            {assessment}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export const Sources: FC = () => {
  const { t } = useTranslation("review");
  const review = useSourcesData();
  const dispatch = useContext(ReviewDispatchContext);
  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto">
        <ToolHeader title={t("sources.title")} instructionsKey="sources" />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("sources.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            {"response" in review ? (
              <section className="mb-3">
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("sources_insights")}</p>}
                  </Translation>
                </header>
                {review.response.citation_issues.length <= 0 ? (
                  <Alert variant="info">{t("sources.no_issues")}</Alert>
                ) : (
                  <Accordion>
                    {review.response.citation_issues.map(
                      ({ description, suggestion, sentences }, i) => (
                        <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                          <Accordion.Header className="accordion-header-highlight">
                            <div>
                              <strong className="d-inline">
                                {t("sources.issue")}
                              </strong>{" "}
                              <span>{description}</span>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body
                            onEntered={() =>
                              dispatch({
                                type: "set",
                                sentences: [sentences],
                              })
                            }
                            onExit={() => dispatch({ type: "unset" })}
                          >
                            {suggestion}
                          </Accordion.Body>
                        </Accordion.Item>
                      )
                    )}
                  </Accordion>
                )}
              </section>
            ) : null}
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("sources.types.title")}</h5>
                  <p>{t("sources.types.subtitle")}</p>
                </header>
                <section>
                  <h6>{t("sources.supportive.title")}</h6>
                  {review.response.supportive_citation.length <= 0 ? (
                    <p>{t("sources.supportive.null")}</p>
                  ) : (
                    <Citations
                      className="mb-3"
                      citations={review.response.supportive_citation}
                    />
                  )}
                </section>
                <section>
                  <h6>{t("sources.hedged.title")}</h6>
                  {review.response.hedged_citation.length <= 0 ? (
                    <p>{t("sources.hedged.null")}</p>
                  ) : (
                    <Citations
                      className="mb-3"
                      citations={review.response.hedged_citation}
                    />
                  )}
                </section>
                <section>
                  <h6>{t("sources.alternative.title")}</h6>
                  {review.response.alternative_citation.length <= 0 ? (
                    <p>{t("sources.alternative.null")}</p>
                  ) : (
                    <Citations
                      className="mb-3"
                      citations={review.response.alternative_citation}
                    />
                  )}
                </section>
                <section>
                  <h6>{t("sources.neutral.title")}</h6>
                  {review.response.neutral_citation.length <= 0 ? (
                    <p>{t("sources.neutral.null")}</p>
                  ) : (
                    <Citations
                      className="mb-3"
                      citations={review.response.neutral_citation}
                    />
                  )}
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
