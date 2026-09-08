import {
  FineTuningButtonToolbar,
  FineTuningTool,
} from "#components/ReviewNavigation/FineTuningButtonToolbar";
import { FC, ReactNode } from "react";
import { Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

type Tool =
  "paragraph_clarity" | "sentence_density" | "professional_tone" | "sources";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname, settings } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
  const { t } = useTranslation("review");
  const id = routeParams.id as string;
  const match = urlPathname.match(/\/snapshot\/[^/]+\/fine_tuning\/([^/]+)/);
  const activeTool = (match?.at(1) as FineTuningTool) ?? null;
  const onSelect = (key: string) => {
    if (key === activeTool) {
      setSnapshotContext({ fine_tuning: null });
      navigate(`/snapshot/${id}/fine_tuning`);
    } else {
      setSnapshotContext({ fine_tuning: key });
      navigate(`/snapshot/${id}/fine_tuning/${key}`);
    }
  };
  const disabled = (tool: Tool): boolean => {
    return !tool_config.includes(tool);
  };

  return (
    <div className="h-100 d-flex flex-column overflow-auto">
      <FineTuningButtonToolbar
        activeTool={activeTool}
        onSelect={onSelect}
        task={task}
        disabled={disabled}
      />
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
