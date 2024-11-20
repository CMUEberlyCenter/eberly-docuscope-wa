import { FC, HTMLProps, useContext, useId, useState } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Claim as ClaimProps } from "../../../lib/ReviewResponse";
import ArgumentsIcon from "../../assets/icons/list_arguments_icon.svg?react";
import { useArgumentsData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { FadeContent } from "../FadeContent/FadeContent";

/** Lines of Arguments title component for use in selection menu. */
export const ArgumentsTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns={"review"}>
    {(t) => (
      <span {...props}>
        <ArgumentsIcon /> {t("arguments.entry")}
      </span>
    )}
  </Translation>
);

type ClaimsProps = AccordionProps & {
  claims?: ClaimProps[] | null;
};

/** Component for displaying a list of Claims. */
const Claims: FC<ClaimsProps> = ({ claims, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const prefix = useId();

  return (
    <>
      {claims?.length && (
        <Translation ns={"review"}>
          {(t) => (
            <Accordion {...props}>
              {claims.map(({ claim, support, suggestions, claim_sentences, evidence_sentences }, i) => (
                <Accordion.Item
                  key={`${prefix}-${i}`}
                  eventKey={`${prefix}-${i}`}
                >
                  <Accordion.Header>
                    <div className="flex-grow-1">
                      <h6 className="d-inline">{t("arguments.claim")}</h6>{" "}
                      <span>{claim}</span>
                    </div>
                    <AlertIcon
                      message={t("arguments.no_sentences")}
                      show={claim_sentences.length + evidence_sentences.length === 0}
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() => dispatch({ type: "set", sentences: [...claim_sentences, ...evidence_sentences] })}
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    {support && (
                      <p>
                        <h6 className="d-inline">{t("arguments.support")}</h6>{" "}
                        <span>{support}</span>
                      </p>
                    )}
                    {suggestions?.length && (
                      <p>
                        <h6>{t("arguments.suggestions")}</h6>
                        <ul>
                          {suggestions.map((suggestion, k) => (
                            <li key={`${i}-${k}`}>{suggestion}</li>
                          ))}
                        </ul>
                      </p>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Translation>
      )}
    </>
  );
};

/**
 * Component for displaying the results of Lines of Arguments review.
 * @returns
 */
export const Arguments: FC = () => {
  const { t } = useTranslation("review");
  const review = useArgumentsData();
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("arguments.title")}</h4>
        <FadeContent>{t("arguments.overview")}</FadeContent>
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("arguments.error")}</Alert>}
          >
            {/* {review.datetime && (
            <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>
          )} */}
            {review.response.thesis ? (
              <article className="mt-3">
                <h5>{t("arguments.main")}</h5>
                <p>{review.response.thesis}</p>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.arguments}
                />
              </article>
            ) : null}
            {review.response.counter_arguments?.length ? (
              <article className="mt-3">
                <h5>{t("arguments.counter_examples")}</h5>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.counter_arguments}
                />
              </article>
            ) : null}
            {review.response.rebuttals?.length ? (
              <article className="mt-3">
                <h5>{t("arguments.rebuttals")}</h5>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.rebuttals}
                />
              </article>
            ) : null}
            {!review.response.rebuttals?.length &&
            !review.response.counter_arguments?.length &&
            !review.response.thesis ? (
              <Alert variant="warning">{t("arguments.null")}</Alert>
            ) : null}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
