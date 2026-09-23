import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import {
  ProminentTopics,
  ProminentTopicsContext,
} from "#components/Review/ProminentTopics";
import { AccessDeniedReason } from "#lib/AccessDeniedReason";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onProminentTopics } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.prominent_topics) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "prominent_topics")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("prominent_topics")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["prominent_topics", id],
    queryFn: async () => {
      const analysis = await onProminentTopics(id);
      if ("error" in analysis) {
        throw new Error(
          analysis.error?.detail ||
            "Unknown error occurred while fetching Prominent Topics data."
        );
      }
      return analysis;
    },
  });
  // Following is to deny access to the Prominent Topics tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool
        tool="prominent_topics"
        reason={accessDeniedReason}
      />
    );
  }
  return (
    <ProminentTopicsContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <ProminentTopics />
    </ProminentTopicsContext>
  );
};
