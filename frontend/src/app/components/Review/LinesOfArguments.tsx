import classNames from "classnames";
import { FC, HTMLProps, useContext, useEffect, useId, useState } from "react";
import { Accordion, AccordionProps, Alert, ButtonProps } from "react-bootstrap";
import {
  AccordionEventKey,
  AccordionSelectCallback,
} from "react-bootstrap/esm/AccordionContext";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import { Claim as ClaimProps, isErrorData } from "../../../lib/ReviewResponse";
import Icon from "../../assets/icons/list_arguments_icon.svg?react";
import { useLinesOfArgumentsData } from "../../service/review.service";
import { AlertIcon } from "../AlertIcon/AlertIcon";
import { Loading } from "../Loading/Loading";
import { Summary } from "../Summary/Summary";
import { ToolButton } from "../ToolButton/ToolButton";
import { ToolHeader } from "../ToolHeader/ToolHeader";
import { ReviewDispatchContext, ReviewReset } from "./ReviewContext";
import { ReviewErrorData } from "./ReviewError";

/** Button component for selecting the Lines Of Arguments tool. */
export const LinesOfArgumentsButton: FC<ButtonProps> = (props) => {
  const { t } = useTranslation("review");
  const { t: it } = useTranslation("instructions");
  return (
    <ToolButton
      {...props}
      title={t("lines_of_arguments.title")}
      tooltip={it("lines_of_arguments_scope_note")}
      icon={<Icon />}
    />
  );
};

type ClaimsProps = AccordionProps & {
  claims?: ClaimProps[] | null;
};

/** Component for displaying a list of Claims. */
const Claims: FC<ClaimsProps> = ({ claims, ...props }) => {
  const dispatch = useContext(ReviewDispatchContext);
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
                    {suggestion || impact ? (
                      <div className="m-3 mt-2">
                        <h6>{t("lines_of_arguments.suggestions")}</h6>
                        <ul>
                          {suggestion ? (
                            <li key={`${i}-suggestion`}>{suggestion}</li>
                          ) : null}
                          {impact ? (
                            <li key={`${i}-impact`}>{impact}</li>
                          ) : null}
                        </ul>
                      </div>
                    ) : null}
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

/**
 * Component for displaying the results of Lines of Arguments review.
 */
export const LinesOfArguments: FC<HTMLProps<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  const { t } = useTranslation("review");
  const review = useLinesOfArgumentsData();
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);
  const dispatch = useContext(ReviewDispatchContext);
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
    <ReviewReset>
      <article
        {...props}
        className={classNames(
          className,
          "container-fluid overflow-auto d-flex flex-column flex-grow-1"
        )}
      >
        <ToolHeader
          title={t("lines_of_arguments.title")}
          instructionsKey="lines_of_arguments"
        />
        {!review ? (
          <Loading />
        ) : (
          <ErrorBoundary
            fallback={
              <Alert variant="danger">{t("lines_of_arguments.error")}</Alert>
            }
          >
            {/* {review.datetime && (
            <Card.Subtitle className="text-center">
              {new Date(review.datetime).toLocaleString()}
            </Card.Subtitle>
          )} */}
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            <Summary review={review} />
            {"response" in review ? (
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
                      <p className="d-inline">{review.response.thesis}</p>
                      {/* <Button onMouseEnter={() => dispatch({ type: "set", sentences: [review.response.sent_ids??[]] })} onMouseLeave={() => dispatch({ type: "unset" })} variant="link" className="p-0 ms-2">
                        SOURCE</Button> */}
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
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
