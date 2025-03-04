import { FC, useContext, useId } from "react";
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

export const CivilTone: FC = () => {
  const { t } = useTranslation("review");
  const review = useCivilToneData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto d-flex flex-column flex-grow-1">
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
                {review.response.issues.length ? (
                  <Accordion>
                    {review.response.issues.map((sent, i) => (
                      <Accordion.Item
                        key={`${id}-${i}`}
                        eventKey={`${id}-${i}`}
                      >
                        <Accordion.Header className="accordion-header-highlight">
                          <h6 className="d-inline">{t("civil_tone.prefix")}</h6>{" "}
                          &quot;{sent.sentence}&quot;
                        </Accordion.Header>
                        <Accordion.Body
                          className="pb-3"
                          onEntered={() =>
                            dispatch({
                              type: "set",
                              sentences: [[sent.sentence_id]],
                            })
                          }
                          onExit={() => dispatch({ type: "unset" })}
                        >
                          <p>{sent.assessment}</p>
                          <p>{sent.suggestion}</p>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                ) : (
                  <div>
                    <h6 className="d-inline">{t("civil_tone.prefix")}</h6>{" "}
                    {t("civil_tone.null")}
                  </div>
                )}
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
