import { FC } from "react";
import { Card, ListGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Suggestion } from "../../../lib/ReviewResponse";
import { useGlobalCoherenceData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

const Suggestions: FC<{ suggestions: Suggestion[] }> = ({ suggestions }) => {
  const { t } = useTranslation("review");
  return (
    <ListGroup>
      {suggestions.map((suggestion, i) => (
        <ListGroup.Item key={i}>
          <h4>{t("global_coherence.suggestion.text")}</h4>
          <p>{suggestion.text}</p>
          <h4>{t("global_coherence.suggestion.explanation")}</h4>
          <p>{suggestion.explanation}</p>
          <h4>{t("global_coherence.suggestion.suggestions")}</h4>
          <p>{suggestion.suggestions}</p>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};

export const GlobalCoherence: FC = () => {
  const { t } = useTranslation("review");
  const review = useGlobalCoherenceData();

  return (
    <Card>
      <Card.Body>
        <Card.Title className="text-center">
          {t("global_coherence.title")}
        </Card.Title>
        {!review ? (
          <Loading />
        ) : (
          <>
            <Card.Subtitle className="text-center">
              {review.datetime
                ? new Date(review.datetime).toLocaleString()
                : ""}
            </Card.Subtitle>
            <Card>
              <Card.Body>
                <Card.Title>{t("global_coherence.contract")}</Card.Title>
                <Suggestions
                  suggestions={review.response["Given New Contract Violation"]}
                />
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("global_coherence.shift")}</Card.Title>
                <Suggestions
                  suggestions={review.response["Sudden Shift in Topic"]}
                />
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("global_coherence.order")}</Card.Title>
                <Suggestions suggestions={review.response["Illogical Order"]} />
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("global_coherence.redundant")}</Card.Title>
                <Suggestions
                  suggestions={review.response["Redundant Information"]}
                />
              </Card.Body>
            </Card>
            <Card>
              <Card.Body>
                <Card.Title>{t("global_coherence.inconsistent")}</Card.Title>
                <Suggestions
                  suggestions={review.response["Inconsistent Information"]}
                />
              </Card.Body>
            </Card>
          </>
        )}
      </Card.Body>
    </Card>
  );
};
