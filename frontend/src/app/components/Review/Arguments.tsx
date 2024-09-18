import { FC, useContext, useId, useState } from "react";
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
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";

/** Lines of Arguments title component for use in selection menu. */
export const ArgumentsTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-primary">
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
              {claims.map(({ claim, support, suggestions, sentences }, i) => (
                <Accordion.Item
                  key={`${prefix}-${i}`}
                  eventKey={`${prefix}-${i}`}
                >
                  <Accordion.Header>
                    <span>
                      <span className="fw-bold">{t("arguments.claim")}</span>
                      <span>{claim}</span>
                    </span>
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() => dispatch({ type: "set", sentences })}
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    {support && (
                      <div>
                        <span className="fw-bold">
                          {t("arguments.support")}
                        </span>
                        <span>{support}</span>
                      </div>
                    )}
                    {suggestions?.length && (
                      <div>
                        <span className="fw-bold">
                          {t("arguments.suggestions")}
                        </span>
                        <ul>
                          {suggestions.map((suggestion, k) => (
                            <li key={`${i}-${k}`}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
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
      <div className="overflow-auto">
        <h4>{t("arguments.title")}</h4>
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
            {review.response.main_argument ? (
              <article>
                <h5>{t("arguments.main")}</h5>
                <p>{review.response.main_argument}</p>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.arguments}
                />
              </article>
            ) : null}
            {review.response.counter_examples?.length ? (
              <article>
                <h5>{t("arguments.counter_examples")}</h5>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.counter_examples}
                />
              </article>
            ) : null}
            {review.response.rebuttals?.length ? (
              <article>
                <h5>{t("arguments.rebuttals")}</h5>
                <Claims
                  onSelect={onSelect}
                  activeKey={current}
                  claims={review.response.rebuttals}
                />
              </article>
            ) : null}
            {!review.response.rebuttals?.length &&
            !review.response.counter_examples?.length &&
            !review.response.main_argument ? (
              <Alert variant="warning">{t("arguments.null")}</Alert>
            ) : null}
          </ErrorBoundary>
        )}
      </div>
    </ReviewReset>
  );
};
