import classNames from "classnames";
import {
  type FC,
  type HTMLProps,
  useEffect,
  useId,
  useState
} from "react";
import {
  Accordion,
  type AccordionProps,
  Alert,
  type ButtonProps,
} from "react-bootstrap";
import type {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { Translation, useTranslation } from "react-i18next";
import Icon from "../../assets/icons/list_arguments_icon.svg?react";
import {
  type Claim as ClaimProps,
  type LinesOfArgumentsData
} from "../../src/lib/ReviewResponse";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { ToolButton } from "../ToolButton/ToolButton";
import {
  PreviewCardProps,
  ReviewToolCard,
  ReviewToolContentProps,
  useReview,
  useReviewDispatch,
  useSnapshotReview
} from "./ReviewContext";

/** Button component for selecting the Lines Of Arguments tool. */
export const LinesOfArgumentsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  return (
    <ToolButton
      {...props}
      title={t("review:lines_of_arguments.title")}
      tooltip={t("instructions:lines_of_arguments_scope_note")}
      icon={<Icon />}
    />
  );
};

type ClaimsProps = AccordionProps & {
  claims?: ClaimProps[] | null;
};

/** Component for displaying a list of Claims. */
const Claims: FC<ClaimsProps> = ({ claims, ...props }) => {
  const dispatch = useReviewDispatch();
  const prefix = useId();

  return (
    <Translation ns={"review"}>
      {(t) =>
        claims?.length ? (
          <Accordion {...props}>
            {claims.map(
              (
                {
                  claim,
                  support,
                  claim_sent_ids,
                  support_sent_ids,
                  suggestion,
                  impact,
                },
                i
              ) => (
                <Accordion.Item
                  key={`${prefix}-${i}`}
                  eventKey={`${prefix}-${i}`}
                >
                  <Accordion.Header className="accordion-header-highlight">
                    <div className="flex-grow-1">
                      <h6 className="d-inline">
                        {t("lines_of_arguments.claim")}
                      </h6>{" "}
                      <span>{claim}</span>
                    </div>
                    <AlertIcon
                      message={t("lines_of_arguments.no_sentences")}
                      show={
                        (claim_sent_ids ?? []).length +
                        (support_sent_ids ?? []).length ===
                        0
                      }
                    />
                  </Accordion.Header>
                  <Accordion.Body
                    className="p-0 pb-3"
                    onEntered={() =>
                      dispatch({
                        type: "set",
                        sentences: [
                          claim_sent_ids ?? [],
                          support_sent_ids ?? [],
                        ],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    {/* {support && typeof support === "string" ? (
                      <div
                        className={classNames(
                          "p-3 pb-2",
                          (support_sent_ids ?? []).length &&
                          "highlight highlight-1"
                        )}
                      >
                        <h6 className="d-inline">
                          {t("lines_of_arguments.support")}
                        </h6>{" "}
                        <span>{support}</span>
                      </div>
                    ) : null} */}
                    {support && Array.isArray(support) ? (
                      <div
                        className={classNames(
                          "p-3 pb-2",
                          (support_sent_ids ?? []).length &&
                          "highlight highlight-1"
                        )}
                      >
                        <h6>{t("lines_of_arguments.support")}</h6>
                        <ul>
                          {support.map((s, k) => (
                            <li key={`${i}-${k}`}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="m-3 mt-2">
                      <h6>{t("lines_of_arguments.suggestions")}</h6>
                      {suggestion || impact ? (
                        <ul>
                          {suggestion ? (
                            <li key={`${i}-suggestion`}>{suggestion}</li>
                          ) : null}
                          {impact ? (
                            <li key={`${i}-impact`}>{impact}</li>
                          ) : null}
                        </ul>
                      ) : (
                        <p>{t("lines_of_arguments.no_suggestions")}</p>
                      )}
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              )
            )}
          </Accordion>
        ) : (
          <Alert variant="warning">{t("lines_of_arguments.null")}</Alert>
        )
      }
    </Translation>
  );
};

const LinesOfArgumentsContent: FC<ReviewToolContentProps<LinesOfArgumentsData>> = ({
  review,
  ...props
}) => {
  const { t } = useTranslation("review");
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);
  const dispatch = useReviewDispatch();
  useEffect(() => {
    if (
      !current &&
      review &&
      "response" in review &&
      review?.response?.sent_ids
    ) {
      dispatch({ type: "set", sentences: [review.response.sent_ids ?? []] });
    }
  }, [current, review, dispatch]);

  return (
    <ReviewToolCard
      title={t("lines_of_arguments.title")}
      instructionsKey={"lines_of_arguments"}
      errorMessage={t("lines_of_arguments.error")}
      review={review}
      {...props}
    >
      {review && "response" in review ? (
        <section>
          <header>
            <h5 className="text-primary">{t("insights")}</h5>
            <Translation ns="instructions">
              {(t) => <p>{t("lines_of_arguments_insights")}</p>}
            </Translation>
          </header>
          <section className="mt-3">
            {review.response.thesis ? (
              <div>
                <h6 className="d-inline">
                  {t("lines_of_arguments.main")}
                </h6>{" "}
                <p
                  className={classNames(
                    "d-inline",
                    !current ? "highlight highlight-0" : ""
                  )}
                >
                  {review.response.thesis}
                </p>
              </div>
            ) : null}
            {"strategies" in review.response &&
              Array.isArray(review.response.strategies) ? (
              <section className="mt-3">
                <h6>{t("lines_of_arguments.strategies")}</h6>
                <ul>
                  {review.response.strategies.map((strat, i) => (
                    <li key={`loa-strat-${i}`}>{strat}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            <Claims
              onSelect={onSelect}
              activeKey={current}
              claims={review.response.claims}
            />
            {!review.response.thesis &&
              !review.response.strategies?.length &&
              !review.response.claims?.length ? (
              <Alert variant="warning">
                {t("lines_of_arguments.null")}
              </Alert>
            ) : null}
          </section>
        </section>
      ) : null}
    </ReviewToolCard>
  );
};
/**
 * Component for displaying the results of Lines of Arguments review.
 */
export const LinesOfArguments: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { review, pending } = useReview<LinesOfArgumentsData>("lines_of_arguments");

  return (
    <LinesOfArgumentsContent
      isPending={pending}
      review={review}
      {...props}
    />
  );
};

export const LinesOfArgumentsPreview: FC<
  PreviewCardProps<LinesOfArgumentsData>
> = ({ className, reviewID, analysis, ...props }) => {
  const { review, pending } = useSnapshotReview<LinesOfArgumentsData>(
    "lines_of_arguments",
    reviewID,
    analysis
  );

  return (
    <LinesOfArgumentsContent
      isPending={pending}
      review={review}
      {...props}
    />
  );
};
