import { FC, HTMLProps, useContext } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import KeyIdeasIcon from "../../assets/icons/list_key_ideas_icon.svg?react";
import { useKeyPointsData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";

/** List of Key Ideas title component for use in selection menu. */
export const KeyIdeasTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <KeyIdeasIcon /> {t("key_ideas.entry")}
      </span>
    )}
  </Translation>
);

/** Component for displaying results of Key Ideas review results. */
export const KeyIdeas: FC = () => {
  const { t } = useTranslation("review");
  const review = useKeyPointsData();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("key_ideas.title")}</h4>
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("key_ideas.error")}</Alert>}
          >
            {/* {review.datetime && (
              <Card.Subtitle className="text-center">
                {new Date(review.datetime).toLocaleString()}
              </Card.Subtitle>
            )} */}
            {"points" in review.response && review.response.points.length ? (
              <Accordion>
                {review.response.points.map(
                  ({ point, elaborations, suggestions, sentences }, i) => (
                    <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                      <Accordion.Header>
                        <div className="flex-grow-1">
                          <h6 className="d-inline">
                            {t("key_ideas.idea")}
                          </h6>{" "}
                          <span>{point}</span>
                        </div>
                        <AlertIcon
                          show={sentences.length === 0}
                          message={t("key_ideas.no_sentences")}
                        />
                      </Accordion.Header>
                      <Accordion.Body
                        onEntered={() => dispatch({ type: "set", sentences })}
                        onExit={() => dispatch({ type: "unset" })}
                      >
                        {elaborations?.length ? (
                          <p>
                            <h6>{t("key_ideas.elaborations")}</h6>
                            <ul>
                              {elaborations.map(
                                ({ elaboration_strategy, explanation }, k) => (
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
                          </p>
                        ) : null}
                        {suggestions?.length ? (
                          <p>
                            <h6>{t("key_ideas.suggestions")}</h6>
                            <ul>
                              {suggestions.map((suggestion, k) => (
                                <li key={`suggestion-${i}-${k}`}>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </p>
                        ) : null}
                      </Accordion.Body>
                    </Accordion.Item>
                  )
                )}
              </Accordion>
            ) : (
              <Alert variant="warning">{t("key_ideas.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
