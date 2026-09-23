import { AccessDeniedReason } from "#/lib/AccessDeniedReason";
import { AccessDeniedReviewTool } from "#components/AccessDenied/AccessDeniedReviewTool";
import { Sources, SourcesContext } from "#components/Review/Sources";
import { isEnabled } from "#lib/WritingTask";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { Data } from "../../+data";
import { onSources } from "./Page.telefunc";

export const Page: FC = () => {
  const { task, tool_config } = useData<Data>();
  const {
    settings,
    routeParams: { id },
  } = usePageContext();

  const accessDeniedReason = (() => {
    if (!settings?.sources) {
      return AccessDeniedReason.SERVER_DENY;
    }
    if (task && !isEnabled(task, "sources")) {
      return AccessDeniedReason.WRITING_TASK_DENY;
    }
    if (!tool_config.includes("sources")) {
      return AccessDeniedReason.SNAPSHOT_CONFIG_DENY;
    }
    return null;
  })();

  const result = useSuspenseQuery({
    queryKey: ["sources", id],
    queryFn: async () => {
      const analysis = await onSources(id);
      if ("error" in analysis) {
        throw new Error(
          analysis.error?.detail ||
            "Unknown error occurred while fetching Sources data."
        );
      }
      return analysis;
    },
  });

  // Following is to deny access to the Sources tool if the server settings or writing task does not allow it, preventing access via url manipulation.
  // Preserves most of the interface unlike using +guard hook.
  if (accessDeniedReason) {
    return (
      <AccessDeniedReviewTool tool="sources" reason={accessDeniedReason} />
    );
  }
  return (
    <SourcesContext
      value={{ pending: result.isLoading, review: result.data?.analysis }}
    >
      <Sources />
    </SourcesContext>
  );
};
