import classNames from "classnames";
import { type FC, type HTMLProps, useContext, useId } from "react";
import { Accordion, type AccordionProps, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  type CredibilityOutput,
  isErrorData,
} from "../../../lib/ReviewResponse";
import { useCredibilityData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Accordion component for displaying sentence assessments. */
const SentenceAssessments: FC<
  AccordionProps & { assessments?: CredibilityOutput }
> = ({ assessments, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
  const prefix = useId();
  return (
    <Translation ns="review">
      {(t) =>
        assessments?.length ? (
          <Accordion {...props}>
            {assessments.map(({ issue, suggestion, sent_ids }, i) => (
              <Accordion.Item
                key={`${prefix}-${i}`}
                eventKey={`${prefix}-${i}`}
              >
                <Accordion.Header className="accordion-header-highlight">
                  <div className="fex-grow-1">
                    <h6 className="d-inline">{t("ethos.assessment")}</h6>{" "}
                    <span>{issue}</span>
                  </div>
                  <AlertIcon
                    message={t("ethos.no_sentences")}
                    show={sent_ids.length === 0}
                  />
                </Accordion.Header>
                <Accordion.Body
                  className="pb-3"
                  onEntered={() =>
                    dispatch({
                      type: "set",
                      sentences: [sent_ids],
                    })
                  }
                  onExit={() => dispatch({ type: "unset" })}
                >
                  {suggestion}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Alert variant="warning">{t("ethos.null")}</Alert>
        )
      }
    </Translation>
  );
};

/** Ethos review tool component. */
export const Ethos: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  // credibility
  const { t } = useTranslation("review");
  const review = useCredibilityData();

  return (
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader title={t("ethos.title")} instructionsKey="ethos" />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={<Alert variant="danger">{t("ethos.error")}</Alert>}
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
              <section>
                <header>
                  <h5 className="text-primary">{t("insights")}</h5>
                  <Translation ns="instructions">
                    {(t) => <p>{t("ethos_insights")}</p>}
                  </Translation>
                </header>
                <section>
                  <SentenceAssessments assessments={review.response} />
                </section>
              </section>
            ) : (
              <Alert variant="warning">{t("ethos.null")}</Alert>
            )}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
