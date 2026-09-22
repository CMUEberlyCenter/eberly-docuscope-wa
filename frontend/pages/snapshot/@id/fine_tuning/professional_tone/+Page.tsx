import {
  AccessDeniedReason,
  AccessDeniedReviewTool,
} from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ProfessionalTone,
  ProfessionalToneContext,
} from "#components/Review/ProfessionalTone";
import { getAnalysis } from "#components/ReviewContext/createReviewDataContext";
import { OptionalReviewData, ProfessionalToneData } from "#lib/ReviewResponse";
import { isEnabled } from "#lib/WritingTask";
import { FC, useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onProfessionalTone } from "./Page.telefunc";

export const Page: FC = () => {
  const { analyses, task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<
    OptionalReviewData<ProfessionalToneData>
  >(
    () =>
      getAnalysis<ProfessionalToneData>(analyses, "professional_tone") ?? null
  );

  const accessGranted =
    settings?.professional_tone &&
    isEnabled(task, "professional_tone") &&
    tool_config.includes("professional_tone");
  useEffect(() => {
    if (!analysis && accessGranted) {
      const handleGetData = async () => {
        setLoading(true);
        try {
          const snapshotData = await onProfessionalTone(id);
          console.log(`Snapshot data received for id ${id}:`, snapshotData);
          if ("error" in snapshotData) {
            throw new Error(
              snapshotData.error?.detail ||
                "Unknown error occurred while fetching Professional Tone data."
            );
          }
          setAnalysis(snapshotData.analysis);
        } catch (error) {
          console.error("Error fetching Professional Tone data:", error);
        } finally {
          setLoading(false);
        }
      };
      handleGetData();
    }
  }, [analysis, accessGranted, id]);
  // Following is to deny access to the Professional Tone tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (!settings?.professional_tone) {
    return (
      <AccessDeniedReviewTool
        tool="professional_tone"
        reason={AccessDeniedReason.SERVER_DENY}
      />
    );
  }
  if (task && !isEnabled(task, "professional_tone")) {
    return (
      <AccessDeniedReviewTool
        tool="professional_tone"
        reason={AccessDeniedReason.WRITING_TASK_DENY}
      />
    );
  }
  if (!tool_config.includes("professional_tone")) {
    return (
      <AccessDeniedReviewTool
        tool="professional_tone"
        reason={AccessDeniedReason.SNAPSHOT_CONFIG_DENY}
      />
    );
  }
  return (
    <ProfessionalToneContext value={{ pending: loading, review: analysis }}>
      <ProfessionalTone />
    </ProfessionalToneContext>
  );
};
