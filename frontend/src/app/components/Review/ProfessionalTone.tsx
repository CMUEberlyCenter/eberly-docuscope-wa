import { FC, useContext, useId } from "react";
import { Accordion, AccordionProps, Alert, ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData, SentenceToneIssue } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/professional_tone_icon.svg?react";
import { useProfessionalToneData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const ProfessionalToneButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("professional_tone.title")}
      tooltip={it("professional_tone_scope_note")}
      icon={<Icon />}
    />
  );
};

const SentenceToneIssues: FC<
  AccordionProps & { issues: SentenceToneIssue[] }
> = ({ issues, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();

  if (issues.length <= 0) {
    return (
      <Translation ns={"review"}>
        {(t) => <Alert variant="info">{t("professional_tone.null")}</Alert>}
      </Translation>
    );
  }
  return (
    <Accordion {...props}>
      {issues.map((sent, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            &quot;{sent.sentence}&quot;
          </Accordion.Header>
          <Accordion.Body
            className="pb-3"
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
      <article className="container-fluid overflow-auto d-flex flex-column flex-grow-1">
        <ToolHeader
          title={t("professional_tone.title")}
          instructionsKey="professional_tone"
        />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("professional_tone.error")}</Alert>
            }
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("professional_tone_insights")}</p>}
                  </Translation>
                </header>
                <section>
                  <h5>{t("professional_tone.sentiment")}</h5>
                  <SentenceToneIssues issues={review.response.sentiment} />
                </section>
                <section>
                  <h5>{t("professional_tone.confidence")}</h5>
                  <SentenceToneIssues issues={review.response.confidence} />
                </section>
                <section>
                  <h5>{t("professional_tone.subjectivity")}</h5>
                  <SentenceToneIssues issues={review.response.subjectivity} />
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
