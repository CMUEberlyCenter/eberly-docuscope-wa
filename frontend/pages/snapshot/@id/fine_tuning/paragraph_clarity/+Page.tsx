import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ParagraphClarity,
  ParagraphClarityContext,
} from "#components/Review/ParagraphClarity";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { OptionalReviewData, ParagraphClarityData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onParagraphClarity } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<
    OptionalReviewData<ParagraphClarityData>
  >(
    () =>
      getAnalysis<ParagraphClarityData>(analyses, "paragraph_clarity") ?? null
  );

  const accessGranted =
    settings?.paragraph_clarity &&
    isEnabled(task, "paragraph_clarity") &&
    tool_config.includes("paragraph_clarity");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onParagraphClarity(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Paragraph Clarity data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Paragraph Clarity data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);
  // Following is to deny access to the Paragraph Clarity tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.paragraph_clarity) {
    return (
      <AccessDeniedReviewTool
        tool="paragraph_clarity"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "paragraph_clarity")) {
    return (
      <AccessDeniedReviewTool
        tool="paragraph_clarity"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("paragraph_clarity")) {
    return (
      <AccessDeniedReviewTool
        tool="paragraph_clarity"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <ParagraphClarityContext value={{ pending: loading, review: analysis }}>
      <ParagraphClarity />
    </ParagraphClarityContext>
  );
};
