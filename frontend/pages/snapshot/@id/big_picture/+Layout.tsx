import { ExpectationsButton } from "#components/Review/Expectations";
import { LinesOfArgumentsButton } from "#components/Review/LinesOfArguments";
import { LogicalFlowButton } from "#components/Review/LogicalFlow";
import { OrganizationButton } from "#components/Review/Organization";
import { ProminentTopicsButton } from "#components/Review/ProminentTopics";
import { isEnabled } from "#lib/WritingTask";
import { FC, ReactNode } from "react";
import { Alert, ButtonToolbar } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

type Tool =
  | "expectations"
  | "prominent_topics"
  | "lines_of_arguments"
  | "logical_flow"
  | "term_matrix"
  | "organization";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname, settings } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
  const { t } = useTranslation("review");
  const id = routeParams.id as string;
  const match = urlPathname.match(/\/snapshot\/[^/]+\/big_picture\/([^/]+)/);
  const activeTool = match?.at(1) as string;
  const onSelect = (key: Tool) => {
    if (key === activeTool) {
      setSnapshotContext({ big_picture: null });
      navigate(`/snapshot/${id}/big_picture`);
    } else {
      setSnapshotContext({ big_picture: key });
      navigate(`/snapshot/${id}/big_picture/${key}`);
    }
  };
  const disabled = (tool: Tool): boolean => {
    return !tool_config.includes(tool);
  };

  return (
    <div className="h-100 d-flex flex-column overflow-auto">
      <ButtonToolbar className="m-3 d-flex justify-content-center gap-4">
        {settings?.expectations && isEnabled(task, "expectations") ? (
          <ExpectationsButton
            active={activeTool === "expectations"}
            disabled={disabled("expectations")}
            onClick={() => onSelect("expectations")}
          />
        ) : null}
        {settings?.prominent_topics && isEnabled(task, "prominent_topics") ? (
          <ProminentTopicsButton
            disabled={disabled("prominent_topics")}
            active={activeTool === "prominent_topics"}
            onClick={() => onSelect("prominent_topics")}
          />
        ) : null}
        {settings?.lines_of_arguments &&
        isEnabled(task, "lines_of_arguments") ? (
          <LinesOfArgumentsButton
            disabled={disabled("lines_of_arguments")}
            active={activeTool === "lines_of_arguments"}
            onClick={() => onSelect("lines_of_arguments")}
          />
        ) : null}
        {settings?.logical_flow && isEnabled(task, "logical_flow") ? (
          <LogicalFlowButton
            disabled={disabled("logical_flow")}
            active={activeTool === "logical_flow"}
            onClick={() => onSelect("logical_flow")}
          />
        ) : null}
        {settings?.term_matrix && isEnabled(task, "term_matrix") ? (
          <OrganizationButton
            disabled={disabled("term_matrix")}
            active={activeTool === "organization"}
            onClick={() => onSelect("organization")}
          />
        ) : null}
      </ButtonToolbar>
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <Alert>
            <Alert.Heading>{t("error.header")}</Alert.Heading>
            {t("error.content")}
            {t("error.details", {
              details: {
                message: error instanceof Error ? error.message : String(error),
              },
            })}
          </Alert>
        )}
      >
        {children}
      </ErrorBoundary>
    </div>
  );
};
