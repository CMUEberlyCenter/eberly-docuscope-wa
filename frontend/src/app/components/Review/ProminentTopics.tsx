import classNames from "classnames";
import { FC, useContext } from "react";
import { Accordion, Alert, ButtonProps } from "react-bootstrap";
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
export const ProminentTopics: FC = () => {
  const { t } = useTranslation("review");
  const review = useProminentTopicsData();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto">
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
            {"response" in review && review.response.topics.length ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("prominent_topics_insights")}</p>}
                  </Translation>
                </header>
                <Accordion>
                  {review.response.topics.map(
                    (
                      {
                        topic,
                        elaborations,
                        suggestions,
                        topic_sentences,
                        elaboration_sentences,
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
                              topic_sentences.length +
                                elaboration_sentences.length ===
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
                                topic_sentences,
                                elaboration_sentences,
                              ],
                            })
                          }
                          onExit={() => dispatch({ type: "unset" })}
                        >
                          {elaborations?.length ? (
                            <div
                              className={classNames(
                                "pt-3 px-3 pb-0",
                                elaboration_sentences.length &&
                                  "highlight highlight-1"
                              )}
                            >
                              <h6>{t("prominent_topics.elaborations")}</h6>
                              <ul>
                                {elaborations.map(
                                  (
                                    { elaboration_strategy, explanation },
                                    k
                                  ) => (
                                    <li key={`elaboration-${i}-${k}`}>
                                      <h6 className="d-inline">
                                        {elaboration_strategy}
                                      </h6>
                                      {"  "}
                                      <span>{explanation}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          ) : null}
                          {suggestions?.length ? (
                            <div className="m-3 mt-2">
                              <h6>{t("prominent_topics.suggestions")}</h6>
                              <ul>
                                {suggestions.map((suggestion, k) => (
                                  <li key={`suggestion-${i}-${k}`}>
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </Accordion.Body>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              </section>
            ) : (
              <Alert variant="warning">{t("prominent_topics.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
