import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ParagraphClarity,
  ParagraphClarityContext,
} from "#components/Review/ParagraphClarity";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onParagraphClarity } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.paragraph_clarity) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "paragraph_clarity")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("paragraph_clarity")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["paragraph_clarity", id],
    queryFn: async () => {
      const analysis = await onParagraphClarity(id);
      if ("error" in analysis) {
        throw new Error(
          analysis.error?.detail ||
            "Unknown error occurred while fetching Paragraph Clarity data."
        );
      }
      return analysis;
    },
  });

  // Following is to deny access to the Paragraph Clarity tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool
        tool="paragraph_clarity"
        reason={accessDeniedReason}
      />
    );
  }
  return (
    <ParagraphClarityContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <ParagraphClarity />
    </ParagraphClarityContext>
  );
};
