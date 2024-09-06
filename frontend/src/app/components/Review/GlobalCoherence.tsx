import { FC, useContext, useEffect, useId, useState } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Suggestion } from "../../../lib/ReviewResponse";
import GlobalCoherenceIcon from "../../assets/icons/global_coherence_icon.svg?react";
import { useGlobalCoherenceData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { AccordionEventKey, AccordionSelectCallback } from "react-bootstrap/esm/AccordionContext";

/** Logical Progression title component for use in selection menu. */
export const GlobalCoherenceTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-dark">
        <GlobalCoherenceIcon /> {t("global_coherence.title")}
      </span>
    )}
  </Translation>
);

type SuggestionsProps = AccordionProps & { suggestions: Suggestion[], itemKeyPrefix?: string };
/** Component for listing suggestions. */
const Suggestions: FC<SuggestionsProps> = ({ suggestions, itemKeyPrefix, ...props }) => {
  const { t } = useTranslation("review");
  const dispatch = useContext(ReviewDispatchContext);
  const prefix = itemKeyPrefix ?? useId();

  return (
    <Accordion {...props}>
      {suggestions.map(({ text, explanation, suggestions }, i) => (
        <Accordion.Item key={i} eventKey={`${prefix}-${i}`}>
          <Accordion.Header>
            <span>
              <span className="fw-bold">
                {t("global_coherence.suggestion.text")}
              </span>{" "}
              <span>{text}</span>
            </span>
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [text] })}
            onExit={() => dispatch({ type: "unset" })}
          >
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

/** Component for displaying Logical Progression review results. */
export const GlobalCoherence: FC = () => {
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const { t } = useTranslation("review");
  const review = useGlobalCoherenceData();
  const [violations, setViolations] = useState<Suggestion[] | null>(null);
  const [topicShift, setTopicShift] = useState<Suggestion[] | null>(null);
  const [illogical, setIllogical] = useState<Suggestion[] | null>(null);
  const [redundant, setRedundant] = useState<Suggestion[] | null>(null);
  const [inconsistent, setInconsistent] = useState<Suggestion[] | null>(null);

  useEffect(() => {
    const violationsProp = "Given New Contract Violation";
    setViolations(review && violationsProp in review.response &&
      review.response[violationsProp]?.length ? review.response[violationsProp] : null);
    const shiftProp = "Sudden Shift in Topic";
    setTopicShift(review && shiftProp in review.response &&
      review.response[shiftProp]?.length ? review.response[shiftProp] : null);
    const illogicalProp = "Illogical Order";
    setIllogical(review && illogicalProp in review.response &&
      review.response[illogicalProp]?.length ? review.response[illogicalProp] : null);
    const redundantProp = "Redundant Information";
    setRedundant(review && redundantProp in review.response &&
      review.response[redundantProp]?.length ? review.response[redundantProp] : null);
    const inconsistentProp = "Inconsistent Information";
    setInconsistent(review && inconsistentProp in review.response &&
      review.response[inconsistentProp]?.length ? review.response[inconsistentProp] : null)
  }, [review]);

  const onSelect: AccordionSelectCallback = (eventKey, _event) => setCurrent(eventKey);

  return (
    <ReviewReset>
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
            {violations && (
              <article>
                <h5>{t("global_coherence.contract")}</h5>
                <Suggestions onSelect={onSelect} activeKey={current}
                  suggestions={violations}
                />
              </article>
            )}
            {topicShift && (
              <article className="mt-1">
                <h5>{t("global_coherence.shift")}</h5>
                <Suggestions onSelect={onSelect} activeKey={current}
                  suggestions={topicShift}
                />
              </article>
            )}
            {illogical && (
              <article className="mt-1">
                <h5>{t("global_coherence.order")}</h5>
                <Suggestions onSelect={onSelect} activeKey={current} suggestions={illogical} />
              </article>
            )}
            {redundant && (
              <article className="mt-1">
                <h5>{t("global_coherence.redundant")}</h5>
                <Suggestions onSelect={onSelect} activeKey={current}
                  suggestions={redundant}
                />
              </article>
            )}
            {inconsistent && (
              <article className="mt-1">
                <h5>{t("global_coherence.inconsistent")}</h5>
                <Suggestions onSelect={onSelect} activeKey={current}
                  suggestions={inconsistent}
                />
              </article>
            )}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
