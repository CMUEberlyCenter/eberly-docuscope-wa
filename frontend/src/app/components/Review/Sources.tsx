import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Citation, isErrorData } from "../../../lib/ReviewResponse";
import { useSourcesData } from "../../service/review.service";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const SourcesTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns="review">
    {(t) => (
      <span {...props}>
        {/* TODO icon */} {t("sources.entry")}
      </span>
    )}
  </Translation>
);

const Citations: FC<AccordionProps & { citations: Citation[] }> = ({
  citations,
  ...props
}) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();

  if (citations.length <= 0) {
    return (<Alert variant="info">{t("sources.null")}</Alert>);
  }
  return (
    <Accordion {...props}>
      {citations.map(({ names, assessment, sentences }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header>{names}</Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [sentences] })}
            onExit={() => dispatch({ type: "unset" })}
          >
            {assessment}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export const Sources: FC = () => {
  const { t } = useTranslation("review");
  const review = useSourcesData();
  const dispatch = useContext(ReviewDispatchContext);
  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("sources.title")}</h4>
      </div>
      <Translation ns="instructions">
        {(t) => <FadeContent htmlContent={t("sources")} />}
      </Translation>
      {!review ? (
        <Loading />
      ) : (
        <ErrorBoundary
          fallback={<Alert variant="danger">{t("sources.error")}</Alert>}
        >
          {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
          {"response" in review ? (
            <>
              <h5>{t("sources.supportive")}</h5>
              <Citations citations={review.response.supportive_citation} />
              <h5>{t("sources.hedged")}</h5>
              <Citations citations={review.response.hedged_citation} />
              <h5>{t("sources.alternative")}</h5>
              <Citations citations={review.response.alternative_citation} />
              <h5>{t("sources.neutral")}</h5>
              <Citations citations={review.response.neutral_citation} />
              <h5>{t("sources.issues")}</h5>
              {review.response.citation_issues.length <= 0 ? 
                <Alert variant="info">{t("sources.no_issues")}</Alert> : (
              <Accordion>
                {review.response.citation_issues.map(
                  ({ description, suggestion, sentences }, i) => (
                    <Accordion.Item key={`${i}`} eventKey={`${i}`}>
                      <Accordion.Header>{description}</Accordion.Header>
                      <Accordion.Body
                        onEntered={() =>
                          dispatch({ type: "set", sentences: [sentences] })
                        }
                        onExit={() => dispatch({ type: "unset" })}
                      >
                        {suggestion}
                      </Accordion.Body>
                    </Accordion.Item>
                  )
                )}
              </Accordion>)}
            </>
          ) : null}
        </ErrorBoundary>
      )}
    </ReviewReset>
  );
};
