import classNames from "classnames";
import { FC, useContext, useId, useState } from "react";
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
                  suggestions,
                  claim_sentences,
                  evidence_sentences,
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
                        (claim_sentences ?? []).length +
                          (evidence_sentences ?? []).length ===
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
                          claim_sentences ?? [],
                          evidence_sentences ?? [],
                        ],
                      })
                    }
                    onExit={() => dispatch({ type: "unset" })}
                  >
                    {support ? (
                      <div
                        className={classNames(
                          "p-3 pb-2",
                          (evidence_sentences ?? []).length &&
                            "highlight highlight-1"
                        )}
                      >
                        <h6 className="d-inline">
                          {t("lines_of_arguments.support")}
                        </h6>{" "}
                        <span>{support}</span>
                      </div>
                    ) : null}
                    {suggestions?.length ? (
                      <div className="m-3 mt-2">
                        <h6>{t("lines_of_arguments.suggestions")}</h6>
                        <ul>
                          {suggestions.map((suggestion, k) => (
                            <li key={`${i}-${k}`}>{suggestion}</li>
                          ))}
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
 * @returns
 */
export const LinesOfArguments: FC = () => {
  const { t } = useTranslation("review");
  const review = useLinesOfArgumentsData();
  const [current, setCurrent] = useState<AccordionEventKey>(null);
  const onSelect: AccordionSelectCallback = (eventKey, _event) =>
    setCurrent(eventKey);

  return (
    <ReviewReset>
      <article className="container-fluid overflow-auto d-flex flex-column flex-grow-1">
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
                {review.response.thesis ? (
                  <section className="mt-3">
                    <h6 className="d-inline">{t("lines_of_arguments.main")}</h6>
                    <p>{review.response.thesis}</p>
                    <Claims
                      onSelect={onSelect}
                      activeKey={current}
                      claims={review.response.arguments}
                    />
                  </section>
                ) : null}
                {Array.isArray(review.response.counter_arguments) ? (
                  <section className="mt-3">
                    <h5>{t("lines_of_arguments.counter_examples")}</h5>
                    {review.response.counter_arguments?.length ? (
                      <Claims
                        onSelect={onSelect}
                        activeKey={current}
                        claims={review.response.counter_arguments}
                      />
                    ) : (
                      <span>{t("lines_of_arguments.no_counter_examples")}</span>
                    )}
                  </section>
                ) : null}
                {review.response.rebuttals?.length ? (
                  <section className="mt-3">
                    <h5>{t("lines_of_arguments.rebuttals")}</h5>
                    <Claims
                      onSelect={onSelect}
                      activeKey={current}
                      claims={review.response.rebuttals}
                    />
                  </section>
                ) : null}
                {"response" in review &&
                !review.response.thesis &&
                !review.response.counter_arguments?.length &&
                !review.response.rebuttals?.length ? (
                  <Alert variant="warning">
                    {t("lines_of_arguments.null")}
                  </Alert>
                ) : null}
              </section>
            ) : null}
          </ErrorBoundary>
        )}
      </article>
    </ReviewReset>
  );
};
