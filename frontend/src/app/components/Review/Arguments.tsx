import { FC } from "react";
import { Alert, Card } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Claim as ClaimProps } from "../../../lib/ReviewResponse";
import ArgumentsIcon from "../../assets/icons/list_arguments_icon.svg?react";
import { useArgumentsData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

export const ArgumentsTitle: FC = () => (
  <Translation ns={"review"}>
    {(t) => (
      <>
        <ArgumentsIcon /> {t("arguments.title")}
      </>
    )}
  </Translation>
);

/** Component for rendering a claim. */
const Claim: FC<ClaimProps> = ({ claim, support, suggestions }) => {
  const { t } = useTranslation("review");
  return (
    <Card>
      <Card.Body>
        <Card.Title>{t("arguments.claim")}</Card.Title>
        <Card.Text>{claim}</Card.Text>
        <Card.Title>{t("arguments.support")}</Card.Title>
        <Card.Text>{support}</Card.Text>
        {/* <Card.Title>{t("arguments.sentences")}</Card.Title>
        <ul>
          {sentences.map((sentence, i) => (
            <li key={`claim_sentence_${i}`}>{sentence}</li>
          ))}
        </ul> */
        /* TODO: sentences are for highlighting */}
        <Card.Title>{t("arguments.suggestions")}</Card.Title>
        <ul>
          {suggestions.map((suggestion, i) => (
            <li key={`claim_suggestion_${i}`}>{suggestion}</li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
};

export const Arguments: FC = () => {
  const { t } = useTranslation("review");
  const review = useArgumentsData();

  return (
    <Card>
      <Card.Body>
        <Card.Title className="text-center">
          <ArgumentsTitle />
        </Card.Title>
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("arguments.error")}</Alert>}
          >
            {review.datetime && (
              <Card.Subtitle className="text-center">
                {new Date(review.datetime).toLocaleString()}
              </Card.Subtitle>
            )}
            <Card>
              <Card.Body>
                <Card.Title>{t("arguments.main")}</Card.Title>
                <Card.Text>{review.response.main_argument}</Card.Text>
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("arguments.arguments")}</Card.Title>
                {review.response.arguments?.map((argument, i) => (
                  <Claim key={`argument_${i}`} {...argument} />
                ))}
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("arguments.counter_examples")}</Card.Title>
                {review.response.counter_examples?.map((argument, i) => (
                  <Claim key={`argument_${i}`} {...argument} />
                ))}
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("arguments.rebuttals")}</Card.Title>
                {review.response.rebuttals?.map((argument, i) => (
                  <Claim key={`argument_${i}`} {...argument} />
                ))}
              </Card.Body>
            </Card>
          </ErrorBoundary>
        )}
      </Card.Body>
    </Card>
  );
};
