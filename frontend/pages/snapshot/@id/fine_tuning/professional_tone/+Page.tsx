import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ProfessionalTone,
  ProfessionalToneContext,
} from "#components/Review/ProfessionalTone";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onProfessionalTone } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.professional_tone) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "professional_tone")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("professional_tone")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["professional_tone", id],
    queryFn: async () => {
      const analysis = await onProfessionalTone(id);
      if ("error" in analysis) {
        throw new Error(
          analysis.error?.detail ||
            "Unknown error occurred while fetching Professional Tone data."
        );
      }
      return analysis;
    },
  });
  // Following is to deny access to the Professional Tone tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool
        tool="professional_tone"
        reason={accessDeniedReason}
      />
    );
  }
  return (
    <ProfessionalToneContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <ProfessionalTone />
    </ProfessionalToneContext>
  );
};
