import { FC } from "react";
import { Translation } from "react-i18next";
import { type Analysis, isAssessment } from "../../../lib/ReviewResponse";

export const Summary: FC<{ review: Analysis }> = ({ review }) => {
  if (!("response" in review)) return null;
  const response = review.response;
  if (!isAssessment(response)) return null;
  const { strengths, weaknesses } = response.assessment;
  return (
    <Translation ns={"review"}>
      {(t) => (
        <section className="mb-2">
          <h5 className="text-primary">{t("summary.title")}</h5>
          <div>
            <h6 className="d-inline">{t("summary.strengths")}</h6>{" "}
            <span>{strengths}</span>
          </div>
          <div>
            <h6 className="d-inline">{t("summary.weaknesses")}</h6>{" "}
            <span>{weaknesses}</span>
          </div>
        </section>
      )}
    </Translation>
  );
};
