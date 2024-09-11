import { FC, useContext } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import KeyIdeasIcon from "../../assets/icons/list_key_ideas_icon.svg?react";
import { useKeyPointsData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";

/** List of Key Ideas title component for use in selection menu. */
export const KeyIdeasTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-dark">
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
      <div className="overflow-auto">
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
                        <span>
                          <span className="fw-bold">{t("key_ideas.idea")}</span>
                          <span>{point}</span>
                        </span>
                      </Accordion.Header>
                      <Accordion.Body
                        onEntered={() => dispatch({ type: "set", sentences })}
                        onExit={() => dispatch({ type: "unset" })}
                      >
                        {elaborations?.length ? (
                          <>
                            <h5>{t("key_ideas.elaborations")}</h5>
                            <ul>
                              {elaborations.map(
                                ({ elaboration_strategy, explanation }, k) => (
                                  <li key={`elaboration-${i}-${k}`}>
                                    <span className="fw-bold">
                                      {elaboration_strategy}
                                    </span>
                                    <span>{explanation}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </>
                        ) : null}
                        {suggestions?.length ? (
                          <>
                            <h5>{t("key_ideas.suggestions")}</h5>
                            <ul>
                              {suggestions.map((suggestion, k) => (
                                <li key={`suggestion-${i}-${k}`}>
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </>
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
