import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, SentenceToneIssue } from "../../../lib/ReviewResponse";
import { useProfessionalToneData } from "../../service/review.service";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const ProfessionalToneTitle: FC<HTMLProps<HTMLSpanElement>> = (
  props
) => (
  <Translation ns="review">
    {(t) => (
      <span {...props}>
        {/* TODO icon */} {t("professional_tone.entry")}
      </span>
    )}
  </Translation>
);

const SentenceToneIssues: FC<
  AccordionProps & { issues: SentenceToneIssue[] }
> = ({ issues, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();

  return (
    <Accordion {...props}>
      {issues.map((sent, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            &quot;{sent.sentence}&quot;
          </Accordion.Header>
          <Accordion.Body
            className="p-0 pb-3"
            onEntered={() =>
              dispatch({
                type: "set",
                sentences: [[sent.sentence_id]],
              })
            }
            onExit={() => dispatch({ type: "unset" })}
          >
            <p>{sent.assessment}</p>
            <p>{sent.suggestion}</p>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export const ProfessionalTone: FC = () => {
  const { t } = useTranslation("review");
  const review = useProfessionalToneData();

  return (
    <ReviewReset>
      <div className="container-fluid overflow-auto">
        <h4>{t("professional_tone.title")}</h4>
      </div>
      <Translation ns="instructions">
        {(t) => <FadeContent htmlContent={t("professional_tone")} />}
      </Translation>
      {!review ? (
        <Loading />
      ) : (
        <ErrorBoundary
          fallback={
            <Alert variant="danger">{t("professional_tone.error")}</Alert>
          }
        >
          {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
          {"response" in review ? (
            <>
              <h5>{t("professional_tone.sentiment")}</h5>
              <SentenceToneIssues issues={review.response.sentiment} />
              <h5>{t("professional_tone.confidence")}</h5>
              <SentenceToneIssues issues={review.response.confidence} />
              <h5>{t("professional_tone.subjectivity")}</h5>
              <SentenceToneIssues issues={review.response.subjectivity} />
            </>
          ) : null}
        </ErrorBoundary>
      )}
    </ReviewReset>
  );
};
