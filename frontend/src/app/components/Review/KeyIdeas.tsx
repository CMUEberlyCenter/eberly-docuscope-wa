import { FC, Fragment } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { KeyPointsData } from "../../../lib/ReviewResponse";
import { Loading } from "../Loading/Loading";

type KeyIdeasProps = { review: KeyPointsData | undefined };
export const KeyIdeas: FC<KeyIdeasProps> = ({ review }) => {
  const { t } = useTranslation("review");

  return (
    <Card>
      <Card.Body>
        <Card.Title>{t("key_ideas.title")}</Card.Title>
        {!review ? (
          <Loading />
        ) : (
          <>
            <Card.Subtitle>
              {review.datetime
                ? new Date(review.datetime).toLocaleString()
                : ""}
            </Card.Subtitle>
            {review.response.map((point, i) => (
              <Card key={i}>
                <Card.Body>
                  <Card.Title>{point.point}</Card.Title>
                  <h4>{t("key_ideas.elaborations")}</h4>
                  <dl>
                    {point.elaborations.map((elab, e) => (
                      <Fragment key={`elaboration.${i}.${e}`}>
                        <dt key={`elaboration.${i}.${e}.dt`}>
                          {elab.elaboration_strategy}
                        </dt>
                        <dd key={`elaboration.${i}.${e}.dd`}>
                          {elab.explanation}
                        </dd>
                      </Fragment>
                    ))}
                  </dl>
                  <h4>{t("key_ideas.sentences")}</h4>
                  <ul>
                    {point.sentences.map((sentence, s) => (
                      <li key={`sentence.${i}.${s}`}>{sentence}</li>
                    ))}
                  </ul>
                  <h4>{t("key_ideas.suggestions")}</h4>
                  <ul>
                    {point.suggestions.map((suggestion, g) => (
                      <li key={`suggestion.${i}.${g}`}>{suggestion}</li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            ))}
          </>
        )}
      </Card.Body>
    </Card>
  );
};
