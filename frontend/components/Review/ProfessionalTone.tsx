import { type FC, type HTMLProps, useId } from "react";
import {
  Accordion,
  type AccordionProps,
  Alert,
  type ButtonProps,
} from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import Icon from "../../assets/icons/professional_tone_icon.svg?react";
import {
  type ProfessionalToneData,
  type ProfessionalToneOutput,
} from "../../src/lib/ReviewResponse";
import { ToolButton } from "../ToolButton/ToolButton";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReview,
  useReviewDispatch,
  useSnapshotReview,
} from "./ReviewContext";

/** Button component for selecting the Professional Tone tool. */
export const ProfessionalToneButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:professional_tone.title")}
      tooltip={t("instructions:professional_tone_scope_note")}
      icon={<Icon />}
    />
  );
};

/** Component for displaying sentence tone issues. */
const SentenceToneIssues: FC<
  AccordionProps & { issues: ProfessionalToneOutput }
> = ({ issues, ...props }) => {
  const dispatch = useReviewDispatch();
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

const Content: FC<ReviewToolContentProps<ProfessionalToneData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");

  return (
    <ReviewToolCard
      title={t("professional_tone.title")}
      instructionsKey={"professional_tone"}
      errorMessage={t("professional_tone.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
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
    </ReviewToolCard>
  );
};

/** Professional Tone review tool component. */
export const ProfessionalTone: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } =
    useReview<ProfessionalToneData>("professional_tone");
  return <Content review={review} isPending={pending} {...props} />;
};

export const ProfessionalTonePreview: FC<
  PreviewCardProps<ProfessionalToneData>
> = ({ reviewID, analysis, ...props }) => {
  const { review, pending } = useSnapshotReview<ProfessionalToneData>(
    "professional_tone",
    reviewID,
    analysis
  );
  return <Content review={review} isPending={pending} {...props} />;
};
