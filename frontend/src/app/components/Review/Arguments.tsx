import { FC } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Claim as ClaimProps } from "../../../lib/ReviewResponse";
import ArgumentsIcon from "../../assets/icons/list_arguments_icon.svg?react";
import { useArgumentsData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

export const ArgumentsTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <span className="text-dark">
        <ArgumentsIcon /> {t("arguments.entry")}
      </span>
    )}
  </Translation>
);

type ClaimsProps = AccordionProps & {
  claims?: ClaimProps[] | null;
};
const Claims: FC<ClaimsProps> = ({ claims, ...props }) => (
  <>
    {claims?.length && (
      <Translation ns={"review"}>
        {(t) => (
          <Accordion alwaysOpen {...props}>
            {claims.map(({ claim, support, suggestions }, i) => (
              <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                <Accordion.Header>
                  <span>
                    <span className="fw-bold">{t("arguments.claim")}</span>
                    <span>{claim}</span>
                  </span>
                </Accordion.Header>
                <Accordion.Body>
                  {support && (
                    <div>
                      <span className="fw-bold">{t("arguments.support")}</span>
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

export const Arguments: FC = () => {
  const { t } = useTranslation("review");
  const review = useArgumentsData();

  return (
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
            <>
              <h5>{t("arguments.main")}</h5>
              <p>{review.response.main_argument}</p>
              <Claims claims={review.response.arguments} />
            </>
          ) : null}
          {review.response.counter_examples?.length ? (
            <>
              <h5>{t("arguments.counter_examples")}</h5>
              <Claims claims={review.response.counter_examples} />
            </>
          ) : null}
          {review.response.rebuttals?.length ? (
            <>
              <h5>{t("arguments.rebuttals")}</h5>
              <Claims claims={review.response.rebuttals} />
            </>
          ) : null}
        </ErrorBoundary>
      )}
    </div>
  );
};
