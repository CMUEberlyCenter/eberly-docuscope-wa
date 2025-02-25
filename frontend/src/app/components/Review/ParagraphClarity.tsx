import { FC, useContext, useId } from "react";
import { Accordion, Alert, ButtonProps } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/paragraph_clarity_icon.svg?react";
import { useParagraphClarityData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

export const ParagraphClarityButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("paragraph_clarity.title")}
      tooltip={it("paragraph_clarity_scope_note")}
      icon={<Icon />}
    />
  );
};

export const ParagraphClarity: FC = () => {
  const { t } = useTranslation("review");
  const review = useParagraphClarityData();
  const id = useId();
  const dispatch = useContext(ReviewDispatchContext);

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto">
        <ToolHeader
          title={t("paragraph_clarity.title")}
          instructionsKey="paragraph_clarity"
        />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("paragraph_clarity.error")}</Alert>
            }
          >
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            <section>
              <header>
                <h5 className="text-primary">{t("insights")}</h5>
                <Translation ns="instructions">
                  {(t) => <p>{t("paragraph_clarity_insights")}</p>}
                </Translation>
              </header>
              {"response" in review ? (
                <Accordion>
                  {review.response.paragraphs.map(
                    (
                      { explanation, suggestions, sentence_ids, paragraph_id },
                      i
                    ) => (
                      <Accordion.Item
                        key={`${id}-${i}`}
                        eventKey={`${id}-${i}`}
                      >
                        <Accordion.Header className="accordion-header-highlight">
                          <div className="flex-grow-1">{explanation}</div>
                          <AlertIcon
                            show={sentence_ids.length === 0 && !paragraph_id}
                            message={t("logical_flow.no_sentences")}
                          />
                        </Accordion.Header>
                        <Accordion.Body
                          onEntered={() =>
                            dispatch({
                              type: "set",
                              sentences: [sentence_ids, [paragraph_id]],
                            })
                          }
                          onExit={() => dispatch({ type: "unset" })}
                        >
                          {suggestions}
                        </Accordion.Body>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              ) : null}
            </section>
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
