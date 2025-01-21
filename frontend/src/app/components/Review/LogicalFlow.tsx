import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import { useLogicalFlowData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const LogicalFlowTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns="review">
    {(t) => (
      <span {...props}>
        {/* TODO icon */} {t("logical_flow.entry")}
      </span>
    )}
  </Translation>
);

export const LogicalFlow: FC = () => {
  const { t } = useTranslation("review");
  const review = useLogicalFlowData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("logical_flow.title")}</h4>
      </div>
      <Translation ns="instructions">
        {(t) => <FadeContent htmlContent={t("logical_flow")} />}
      </Translation>
      {!review ? (
        <Loading />
      ) : (
        <ErrorBoundary
          fallback={<Alert variant="danger">{t("logical_flow.error")}</Alert>}
        >
          {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
          {"response" in review ? (
            <Accordion>
              {review.response.disruptions.map(
                ({ explanation, suggestions, sentences, paragraphs }, i) => (
                  <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
                    <Accordion.Header className="accordion-header-highlight">
                      <div className="flex-grow-1">{explanation}</div>
                      <AlertIcon
                        show={sentences.length + paragraphs.length === 0}
                        message={t("logical_flow.no_sentences")}
                      />
                    </Accordion.Header>
                    <Accordion.Body
                      onEntered={() =>
                        dispatch({
                          type: "set",
                          sentences: [sentences, paragraphs],
                        })
                      }
                      onExit={() => dispatch({ type: "unset" })}
                    >
                      {suggestions}
                    </Accordion.Body>
                  </Accordion.Item>
                )
              )}
            </Accordion>
          ) : null}
        </ErrorBoundary>
      )}
    </ReviewReset>
  );
};
