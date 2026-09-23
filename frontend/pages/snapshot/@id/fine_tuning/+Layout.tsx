import {
  FineTuningButtonToolbar,
  FineTuningTool,
} from "#components/ReviewNavigation/FineTuningButtonToolbar";
import { FC, ReactNode } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

type Tool =
  "paragraph_clarity" | "sentence_density" | "professional_tone" | "sources";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
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
      {children}
    </div>
  );
};
