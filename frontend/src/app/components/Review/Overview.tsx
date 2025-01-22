import { FC, HTMLProps, Suspense, useEffect, useId, useState } from "react";
import { Accordion, Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Translation, useTranslation } from "react-i18next";
import {
  ErrorData,
  GeneralAssessment,
  isAssessment,
  isErrorData,
  isExpectationsData,
  ReviewTool,
} from "../../../lib/ReviewResponse";
import { getExpectations } from "../../../lib/WritingTask";
import { useExpectationsData, useReview } from "../../service/review.service";
import { useWritingTask } from "../../service/writing-task.service";
import { FadeContent } from "../FadeContent/FadeContent";
import { Loading } from "../Loading/Loading";
import { ExpectationsTitle } from "./Expectations";
import { ReviewErrorData } from "./ReviewError";

export const OverviewTitle: FC<HTMLProps<HTMLSpanElement>> = (props) => (
  <Translation ns="review">
    {(t) => (
      <span {...props}>
        {/* TODO icon */}
        {t("overview.entry")}
      </span>
    )}
  </Translation>
);

const ExpectationsAssessment: FC = () => {
  const { t } = useTranslation("review");
  const reviews = useExpectationsData();
  const wtd = useWritingTask();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState(true);
  const [covered, setCovered] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!wtd || !reviews) {
      setLoading(true);
      setTotal(0);
      setCovered(0);
      return;
    }
    const expectations = new Set(getExpectations(wtd).map((rule) => rule.name));
    setTotal(expectations.size);
    const analysis = new Set(reviews.keys());
    if (expectations.symmetricDifference(analysis).size > 0) {
      setLoading(true);
      return;
    }
    setErrors(reviews.values().some((rev) => isErrorData(rev)));
    setCovered(
      reviews
        .values()
        .filter((rev) => isExpectationsData(rev))
        .reduce(
          (count, rev) => count + (rev.response.sentences.length > 0 ? 1 : 0),
          0
        )
    );
  }, [reviews, wtd]);

  return (
    <div>
      <h3>
        <ExpectationsTitle />
      </h3>
      {loading ? (
        <Loading />
      ) : (
        <>
          {errors ? (
            <Alert variant="danger">{t("overview.expectations.errors")}</Alert>
          ) : null}
          <p>
            {covered}/{total}
          </p>
        </>
      )}
    </div>
  );
};

const Assessment: FC<{ tool: ReviewTool }> = ({ tool }) => {
  const { t } = useTranslation("review");
  const reviews = useReview();
  const [review, setReview] = useState<GeneralAssessment | ErrorData | null>(
    null
  );
  useEffect(() => {
    setReview(
      reviews.analysis
        .filter((analysis) => isAssessment(analysis) || isErrorData(analysis))
        .find((analysis) => analysis.tool === tool) ?? null
    );
  }, [reviews, tool]);

  return (
    <div>
      <h4>{t(`${tool}.title`)}</h4>
      <Suspense fallback={<Loading />}>
        {!review ? (
          <Loading />
        ) : (
          <>
            {isErrorData(review) ? <ReviewErrorData data={review} /> : null}
            {isAssessment(review) ? (
              <>
                <p>{review.assessment.strengths}</p>
                <p>{review.assessment.weaknesses}</p>
              </>
            ) : null}
          </>
        )}
      </Suspense>
    </div>
  );
};

export const Overview: FC = () => {
  const { t } = useTranslation("review");
  const id = useId();

  return (
    <>
      <div className="container-fluid overflow-auto">
        <h4>{t("overview.title")}</h4>
      </div>
      <Translation ns="instructions">
        {(t) => <FadeContent htmlContent={t("overview")} />}
      </Translation>
      <Suspense fallback={<Loading />}>
        <ErrorBoundary
          fallback={<Alert variant="danger">{t("overview.error")}</Alert>}
        >
          <ExpectationsAssessment />
          <Accordion>
            <Accordion.Item eventKey={`${id}-persuasion`}>
              <Accordion.Header>
                {/* icon */} {t("overview.persuation.title")}
              </Accordion.Header>
              <Accordion.Body>
                <Assessment tool="lines_of_arguments" />
                <Assessment tool="pathos" />
                <Assessment tool="ethos" />
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey={`${id}-topics`}>
              <Accordion.Header>
                {/* icon */} {t("overview.topics.title")}
              </Accordion.Header>
              <Accordion.Body>
                {/* topics */}
                <Assessment tool="logical_flow" />
                {/* topical progression */}
                <Assessment tool="sources" />
              </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey={`${id}-tone`}>
              <Accordion.Header>
                {/* icon */} {t("overview.tone.title")}
              </Accordion.Header>
              <Accordion.Body>
                <Assessment tool="professional_tone" />
                <Assessment tool="civil_tone" />
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </ErrorBoundary>
      </Suspense>
    </>
  );
};
