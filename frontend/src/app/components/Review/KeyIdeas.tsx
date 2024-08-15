import { FC, Fragment } from "react";
import { Alert, Card } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import KeyIdeasIcon from '../../assets/icons/list_key_ideas_icon.svg?react';
import { useKeyPointsData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";

export const KeyIdeasTitle: FC = () => (
  <Translation ns={'review'}>
    {(t) => (
      <>
        <KeyIdeasIcon />{" "}
        {t("key_ideas.title")}
      </>
    )}
  </Translation>
);

export const KeyIdeas: FC = () => {
  const { t } = useTranslation("review");
  const review = useKeyPointsData();

  return (
    <Card>
      <Card.Body>
        <Card.Title className="text-center"><KeyIdeasTitle /></Card.Title>
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("key_ideas.error")}</Alert>}
          >
            {review.datetime && <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>}
            {"points" in review.response &&
              review.response.points.map((point, i) => (
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
                    {/* <h4>{t("key_ideas.sentences")}</h4>
                    <ul>
                      {point.sentences.map((sentence, s) => (
                        <li key={`sentence.${i}.${s}`}>{sentence}</li>
                      ))}
                    </ul> */}
                    <h4>{t("key_ideas.suggestions")}</h4>
                    <ul>
                      {point.suggestions.map((suggestion, g) => (
                        <li key={`suggestion.${i}.${g}`}>{suggestion}</li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              ))}
          </ErrorBoundary>
        )}
      </Card.Body>
    </Card>
  );
};
