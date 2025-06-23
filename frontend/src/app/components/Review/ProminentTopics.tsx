import classNames from "classnames";
import { FC, HTMLProps, useContext, useEffect, useState } from "react";
import { Accordion, Alert, type ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/list_key_ideas_icon.svg?react";
import { useProminentTopicsData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import type { AccordionEventKey } from "react-bootstrap/esm/AccordionContext";

/** Button component for selecting the Prominent Topics tool. */
export const ProminentTopicsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("prominent_topics.title")}
      tooltip={it("prominent_topics_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Component for displaying results of Key Ideas review results. */
export const ProminentTopics: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const review = useProminentTopicsData();
  const dispatch = useContext(ReviewDispatchContext);
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  useEffect(() => {
    if (
      !current &&
      review &&
      "response" in review &&
      review?.response?.sent_ids
    ) {
      dispatch({ type: "set", sentences: [review.response.sent_ids ?? []] });
    }
  }, [current, review, dispatch]);

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader
          title={t("prominent_topics.title")}
          instructionsKey="prominent_topics"
        />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("prominent_topics.error")}</Alert>
            }
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("prominent_topics_insights")}</p>}
                  </Translation>
                </header>
                {review.response.main_idea ? (
                  <div>
                    <h6 className="d-inline">
                      {t("prominent_topics.main_idea")}
                    </h6>{" "}
                    <p
                      className={classNames(
                        "d-inline",
                        !current ? "highlight highlight-0" : ""
                      )}
                    >
                      {review.response.main_idea}
                    </p>
                  </div>
                ) : null}
                {review.response.strategies?.length ? (
                  <div className="mt-3">
                    <h6>{t("prominent_topics.strategies")}</h6>
                    <ul>
                      {review.response.strategies.map((strategy, i) => (
                        <li key={`strategy-${i}`}>{strategy}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {review.response.topics.length ? (
                  <Accordion
                    onSelect={(eventKey, _event) => setCurrent(eventKey)}
                    activeKey={current}
                  >
                    {review.response.topics.map(
                      (
                        {
                          topic,
                          techniques,
                          topic_sents_ids,
                          elaboration_sents_ids,
                          suggestion,
                          impact,
                        },
                        i
                      ) => (
                        <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                          <Accordion.Header className="accordion-header-highlight">
                            <div className="flex-grow-1">
                              <h6 className="d-inline">
                                {t("prominent_topics.idea")}
                              </h6>{" "}
                              <span>{topic}</span>
                            </div>
                            <AlertIcon
                              show={
                                topic_sents_ids.length +
                                  elaboration_sents_ids.length ===
                                0
                              }
                              message={t("prominent_topics.no_sentences")}
                            />
                          </Accordion.Header>
                          <Accordion.Body
                            className="p-0 pb-3"
                            onEntered={() =>
                              dispatch({
                                type: "set",
                                sentences: [
                                  topic_sents_ids,
                                  elaboration_sents_ids,
                                ],
                              })
                            }
                            onExit={() => dispatch({ type: "unset" })}
                          >
                            {techniques?.length ? (
                              <div
                                className={classNames(
                                  "pt-3 px-3 pb-0",
                                  elaboration_sents_ids.length
                                    ? "highlight highlight-1"
                                    : ""
                                )}
                              >
                                <h6>{t("prominent_topics.elaborations")}</h6>
                                <ul>
                                  {techniques.map((technique, k) => (
                                    <li key={`elaboration-${i}-${k}`}>
                                      {technique}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            <div className="m-3 mt-2">
                              <h6>{t("prominent_topics.suggestions")}</h6>
                              {suggestion || impact ? (
                                <ul>
                                  <li key={`suggestion-${i}-${suggestion}`}>
                                    {suggestion}
                                  </li>
                                  <li key={`impact-${i}-${impact}`}>
                                    {impact}
                                  </li>
                                </ul>
                              ) : (
                                <p className="m-3 mt-2">
                                  {t("prominent_topics.no_suggestions")}
                                </p>
                              )}
                            </div>
                          </Accordion.Body>
                        </Accordion.Item>
                      )
                    )}
                  </Accordion>
                ) : (
                  <Alert variant="warning">{t("prominent_topics.null")}</Alert>
                )}
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
