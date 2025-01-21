import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import { useCivilToneData } from "../../service/review.service";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const CivilToneTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        {/* TODO icon */}
        {t("civil_tone.entry")}
      </span>
    )}
  </Translation>
);

export const CivilTone: FC = () => {
  const { t } = useTranslation("review");
  const review = useCivilToneData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("civil_tone.title")}</h4>
        <Translation ns="instructions">
          {(t) => <FadeContent htmlContent={t("civil_tone")} />}
        </Translation>
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("civil_tone.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            {"response" in review ? (
              <Accordion>
                {review.response.issues.map((sent, i) => (
                  <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                    <Accordion.Header className="accordion-header-highlight">
                      &quot;{sent.sentence}&quot;
                    </Accordion.Header>
                    <Accordion.Body
                      className="p-0 pb-3"
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
            ) : null}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
