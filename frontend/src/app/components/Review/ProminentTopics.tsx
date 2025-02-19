import classNames from "classnames";
import { FC, HTMLProps, useContext } from "react";
import { Accordion, Alert, ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/list_key_ideas_icon.svg?react";
import { useProminentTopicsData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";
import { ToolButton } from "../ToolButton/ToolButton";

export const ProminentTopicsButton: FC<ButtonProps> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <ToolButton
        {...props}
        title={t("key_ideas.title")}
        tooltip={t("key_ideas.tooltip")}
        icon={<Icon />}
      />
    )}
  </Translation>
);
/** List of Key Ideas title component for use in selection menu. */
export const ProminentTopicsTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <Icon /> {t("key_ideas.entry")}
      </span>
    )}
  </Translation>
);

/** Component for displaying results of Key Ideas review results. */
export const ProminentTopics: FC = () => {
  const { t } = useTranslation("review");
  const review = useProminentTopicsData();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto">
        <ToolHeader title={t("key_ideas.title")} instructionsKey="key_points" />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("key_ideas.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review && review.response.topics.length ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <p>{t("key_ideas.insights")}</p>
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
                            <h6 className="d-inline">{t("key_ideas.idea")}</h6>{" "}
                            <span>{topic}</span>
                          </div>
                          <AlertIcon
                            show={
                              topic_sentences.length +
                                elaboration_sentences.length ===
                              0
                            }
                            message={t("key_ideas.no_sentences")}
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
                              <h6>{t("key_ideas.elaborations")}</h6>
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
                              <h6>{t("key_ideas.suggestions")}</h6>
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
              <Alert variant="warning">{t("key_ideas.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
