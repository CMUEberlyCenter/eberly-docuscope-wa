import { FC } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Suggestion } from "../../../lib/ReviewResponse";
import GlobalCoherenceIcon from "../../assets/icons/global_coherence_icon.svg?react";
import { useGlobalCoherenceData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

export const GlobalCoherenceTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-dark">
        <GlobalCoherenceIcon /> {t("global_coherence.title")}
      </span>
    )}
  </Translation>
);

const Suggestions: FC<{ suggestions: Suggestion[] }> = ({ suggestions }) => {
  const { t } = useTranslation("review");
  return (
    <Accordion alwaysOpen>
      {suggestions.map(({ text, explanation, suggestions }, i) => (
        <Accordion.Item key={i} eventKey={`${i}`}>
          <Accordion.Header>
            <span>
              <span className="fw-bold">
                {t("global_coherence.suggestion.text")}
              </span>{" "}
              <span>{text}</span>
            </span>
          </Accordion.Header>
          <Accordion.Body>
            <p>
              <span className="fw-bold">
                {t("global_coherence.suggestion.explanation")}
              </span>{" "}
              <span>{explanation}</span>
            </p>
            <p>
              <span className="fw-bold">
                {t("global_coherence.suggestion.suggestions")}
              </span>{" "}
              <span>{suggestions}</span>
            </p>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export const GlobalCoherence: FC = () => {
  const { t } = useTranslation("review");
  const review = useGlobalCoherenceData();

  return (
    <div className="overflow-auto">
      <h4>{t("global_coherence.title")}</h4>
      {!review ? (
        <Loading />
      ) : (
        <ErrorBoundary
          fallback={
            <Alert variant="danger">{t("global_coherence.error")}</Alert>
          }
        >
          {/* {review.datetime && (
            <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>
          )} */}
          {"Given New Contract Violation" in review.response &&
          review.response["Given New Contract Violation"]?.length ? (
            <>
              <h5>{t("global_coherence.contract")}</h5>
              <Suggestions
                suggestions={review.response["Given New Contract Violation"]}
              />
            </>
          ) : null}
          {"Sudden Shift in Topic" in review.response &&
          review.response["Sudden Shift in Topic"]?.length ? (
            <>
              <h5>{t("global_coherence.shift")}</h5>
              <Suggestions
                suggestions={review.response["Sudden Shift in Topic"]}
              />
            </>
          ) : null}
          {"Illogical Order" in review.response &&
          review.response["Illogical Order"]?.length ? (
            <>
              <h5>{t("global_coherence.order")}</h5>
              <Suggestions suggestions={review.response["Illogical Order"]} />
            </>
          ) : null}
          {"Redundant Information" in review.response &&
          review.response["Redundant Information"]?.length ? (
            <>
              <h5>{t("global_coherence.redundant")}</h5>
              <Suggestions
                suggestions={review.response["Redundant Information"]}
              />
            </>
          ) : null}
          {"Inconsistent Information" in review.response &&
          review.response["Inconsistent Information"]?.length ? (
            <>
              <h5>{t("global_coherence.inconsistent")}</h5>
              <Suggestions
                suggestions={review.response["Inconsistent Information"]}
              />
            </>
          ) : null}
        </ErrorBoundary>
      )}
    </div>
  );
};
