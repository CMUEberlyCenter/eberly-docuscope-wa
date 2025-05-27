import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { Accordion, type AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  isErrorData,
  type Source,
  type SourceType,
} from "../../../lib/ReviewResponse";
import { useSourcesData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Accordion component for displaying citations. */
const Citations: FC<
  AccordionProps & { citations?: Source[]; emptyText?: string }
> = ({ citations, emptyText, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();
  const { t } = useTranslation("review");

  if (!citations?.length && emptyText) {
    return <p>{emptyText}</p>;
  }

  return (
    <Accordion {...props}>
      {citations?.map(({ names, assessment, sent_ids }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">
              <h6 className="d-inline">{t("sources.source")}</h6>{" "}
              <p className="d-inline">{names}</p>
            </div>
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [sent_ids] })}
            onExit={() => dispatch({ type: "unset" })}
          >
            {assessment}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

/** Sources review tool component. */
export const Sources: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const review = useSourcesData();
  const dispatch = useContext(ReviewDispatchContext);
  const [sources, setSources] = useState<Partial<Record<SourceType, Source[]>>>(
    {}
  );
  useEffect(() => {
    if (
      review &&
      "response" in review &&
      "sources" in review.response &&
      review.response.sources
    ) {
      const data = Object.groupBy(
        review.response.sources,
        ({ src_type }) => src_type
      );
      setSources(data);
    }
  }, [review]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
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
                {review.response.issues.length <= 0 ? (
                  <Alert variant="info">{t("sources.no_issues")}</Alert>
                ) : (
                  <Accordion>
                    {review.response.issues.map(
                      ({ issue, suggestion, sent_ids }, i) => (
                        <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                          <Accordion.Header className="accordion-header-highlight">
                            <div>
                              <h6 className="d-inline">{t("sources.issue")}</h6>{" "}
                              <p className="d-inline">{issue}</p>
                            </div>
                          </Accordion.Header>
                          <Accordion.Body
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
                  <Citations
                    className="mb-3"
                    citations={sources.supporting}
                    emptyText={t("sources.supportive.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.hedged.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.hedged}
                    emptyText={t("sources.hedged.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.alternative.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.alternative}
                    emptyText={t("sources.alternative.null")}
                  />
                </section>
                <section>
                  <h6>{t("sources.neutral.title")}</h6>
                  <Citations
                    className="mb-3"
                    citations={sources.neutral}
                    emptyText={t("sources.neutral.null")}
                  />
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
