import { FC } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Claim as ClaimProps } from "../../../lib/ReviewResponse";
import { useArgumentsData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

const Claim: FC<ClaimProps> = ({ claim, support, sentences, suggestions }) => {
  const { t } = useTranslation("review");
  return (
    <Card>
      <Card.Body>
        <Card.Title>{t("arguments.claim")}</Card.Title>
        <Card.Text>{claim}</Card.Text>
        <Card.Title>{t("arguments.support")}</Card.Title>
        <Card.Text>{support}</Card.Text>
        <Card.Title>{t("arguments.sentences")}</Card.Title>
        <ul>
          {sentences.map((sentence, i) => (
            <li key={`claim_sentence_${i}`}>{sentence}</li>
          ))}
        </ul>
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
        <Card.Title className="text-center">{t("arguments.title")}</Card.Title>
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
          </>
        )}
      </Card.Body>
    </Card>
  );
};
