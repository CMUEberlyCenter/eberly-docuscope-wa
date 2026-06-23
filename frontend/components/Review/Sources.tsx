import { SourcesData } from "#/lib/ReviewResponse";
import { AlertIcon } from "#components/AlertIcon/AlertIcon.js";
import Icon from "#assets/icons/sources_icon.svg?react";
import { ToolButton } from "#components/ToolButton/ToolButton.js";
import { type FC, type HTMLProps } from "react";
import { Accordion, Alert, ButtonProps } from "react-bootstrap";
import { Translation, useTranslation } from "react-i18next";
import {
  ReviewToolCard,
  useReviewDispatch,
} from "../ReviewContext/ReviewContext";
import { createReviewDataContext } from "../ReviewContext/createReviewDataContext";

export const {
  ReviewDataProvider: SourcesReviewProvider,
  SnapshotDataProvider: SourcesSnapshotProvider,
  useReviewDataContext: useSourcesReview,
} = createReviewDataContext<SourcesData>("sources");

export const SourcesButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return <ToolButton {...props}
    title={t("review:sources.title")}
    tooltip={t("instructions:sources_scope_note")}
    icon={<Icon />}
  />;
};

/** Accordion component for displaying citations. */
const Citations: FC<
  AccordionProps & { citations?: Source[]; emptyText?: string }
> = ({ citations, emptyText, ...props }) => {
  const dispatch = useReviewDispatch();
  const id = useId();
  const { t } = useTranslation("review");

  if (!citations?.length && emptyText) {
    return <p>{emptyText}</p>;
  }

  return (
    <Accordion {...props}>
      {citations?.map(({ names, assessment, sent_ids }, i) => (
        /* eslint-disable-next-line @eslint-react/no-array-index-key */
        <Accordion.Item key={`${id}-${i}`} eventKey={`${id}-${i}`}>
          <Accordion.Header className="accordion-header-highlight">
            <div className="flex-grow-1">
              <h6 className="d-inline">{t("sources.source")}</h6>{" "}
              <p className="d-inline">{names}</p>
            </div>
          </Accordion.Header>
          <Accordion.Body
            onEntered={() => dispatch({ type: "set", sentences: [sent_ids] })}
            onExit={() => dispatch({ type: "unset" })}
          >
            {assessment}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

/** Sources review tool component. */
export const Sources: FC<HTMLProps<HTMLDivElement>> = (props) => {
  const { review, pending } = useSourcesReview();
  const dispatch = useReviewDispatch();
  const { t } = useTranslation("review");
  return (
    <ReviewToolCard
      title={t("sources.title")}
      instructionsKey={"sources"}
      errorMessage={t("sources.error")}
      review={review}
      isPending={pending}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("sources_insights")}</p>}
            </Translation>
          </header>
          {review.response.length <= 0 ? (
            <Alert variant="info">{t("sources.no_issues")}</Alert>
          ) : (
            <Accordion>
              {review.response.map(({ issue, suggestion, sent_ids }, i) => (
                <Accordion.Item
                  key={JSON.stringify({ issue, suggestion, sent_ids })}
                  eventKey={`sources-issues-${i}`}
                >
                  <Accordion.Header className="accordion-header-highlight">
                    <div>
                      <h6 className="d-inline">{t("sources.issue")}</h6>{" "}
                      <p className="d-inline">{issue}</p>
                    </div>
                    <AlertIcon
                      message={t("sources.no_sentences")}
                      show={sent_ids.length <= 0}
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [sent_ids],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    <h6 className="d-inline">{t("sources.suggestion")}</h6>{" "}
                    <p className="d-inline">{suggestion}</p>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </section>
      ) : null}
    </ReviewToolCard>
  );
};
