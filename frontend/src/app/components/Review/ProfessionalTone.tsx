import classNames from "classnames";
import { FC, HTMLProps, useContext, useId } from "react";
import { Accordion, type AccordionProps, Alert, type ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  isErrorData,
  type ProfessionalToneOutput,
} from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/professional_tone_icon.svg?react";
import { useProfessionalToneData } from "../../service/review.service";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Button component for selecting the Professional Tone tool. */
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

/** Component for displaying sentence tone issues. */
const SentenceToneIssues: FC<
  AccordionProps & { issues: ProfessionalToneOutput }
> = ({ issues, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const id = useId();
  const { t } = useTranslation("review");

  if (issues.length <= 0) {
    return <Alert variant="info">{t("professional_tone.null")}</Alert>;
  }
  return (
    <Accordion {...props}>
      {issues.map(({ text, sent_id, issue, suggestion }, i) => (
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <span>
              <h6 className="d-inline">{t("professional_tone.text")}</h6>{" "}
              <q>{text}</q>
            </span>
          </Accordion.Header>
          <Accordion.Body
            className="p-0 pb-3"
            onEntered={() =>
              dispatch({
                type: "set",
                sentences: [[sent_id]],
              })
            }
            onExit={() => dispatch({ type: "unset" })}
          >
            <div className="highlight highlight-1 p-3 pb-2">
              <h6 className="d-inline">{t("professional_tone.issue")}</h6>{" "}
              <p className="d-inline">{issue}</p>
            </div>
            <div className="p-3">
              <h6 className="d-inline">{t("professional_tone.suggestion")}</h6>{" "}
              <p className="d-inline">{suggestion}</p>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

/** Professional Tone review tool component. */
export const ProfessionalTone: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const review = useProfessionalToneData();

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
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
                  <h5>{t("professional_tone.confidence")}</h5>
                  <SentenceToneIssues
                    issues={review.response.filter(
                      ({ tone_type }) => tone_type === "confidence"
                    )}
                  />
                </section>
                <section>
                  <h5>{t("professional_tone.subjectivity")}</h5>
                  <SentenceToneIssues
                    issues={review.response.filter(({ tone_type }) =>
                      ["subjective", "subjectivity"].includes(tone_type)
                    )}
                  />
                </section>
                <section>
                  <h5>{t("professional_tone.sentiment")}</h5>
                  <SentenceToneIssues
                    issues={review.response.filter(
                      ({ tone_type }) => tone_type === "emotional"
                    )}
                  />
                </section>
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
