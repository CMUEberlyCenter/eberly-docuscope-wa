import classNames from "classnames";
import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import { useCivilToneData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Civil Tone Tool component. */
export const CivilTone: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const review = useCivilToneData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);

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
          title={t("civil_tone.title")}
          instructionsKey="civil_tone"
        />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("civil_tone.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("civil_tone_insights")}</p>}
                  </Translation>
                </header>
                {review.response.length ? (
                  <Accordion>
                    {review.response.map(
                      ({ text, assessment, suggestion, sent_id }, i) => (
                        <Accordion.Item
                          key={`${id}-${i}`}
                          eventKey={`${id}-${i}`}
                        >
                          <Accordion.Header className="accordion-header-highlight">
                            <h6 className="d-inline">
                              {t("civil_tone.prefix")}
                            </h6>{" "}
                            <q>{text}</q>
                          </Accordion.Header>
                          <Accordion.Body
                            className="pb-3"
                            onEntered={() =>
                              dispatch({
                                type: "set",
                                sentences: [[sent_id]],
                              })
                            }
                            onExit={() => dispatch({ type: "unset" })}
                          >
                            <div>
                              <h6 className="d-inline">
                                {t("civil_tone.issue")}
                              </h6>{" "}
                              <p className="d-inline">{assessment}</p>
                            </div>
                            <div>
                              <h6 className="d-inline">
                                {t("civil_tone.suggestion")}
                              </h6>{" "}
                              <p className="d-inline">{suggestion}</p>
                            </div>
                          </Accordion.Body>
                        </Accordion.Item>
                      )
                    )}
                  </Accordion>
                ) : (
                  <div className="alert alert-info">{t("civil_tone.null")}</div>
                )}
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
