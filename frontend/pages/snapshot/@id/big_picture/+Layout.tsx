import {
  BigPictureButtonToolbar,
  BigPictureTool,
  WritingTypeBigPictureTool,
} from "#components/ReviewNavigation/BigPictureButtonToolbar";
import { FC, ReactNode } from "react";
import { Alert } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
  const { t } = useTranslation("review");
  const id = routeParams.id as string;
  const match = urlPathname.match(/\/snapshot\/[^/]+\/big_picture\/([^/]+)/);
  const activeTool = (match?.at(1) as BigPictureTool) ?? null;
  const onSelect = (key: BigPictureTool) => {
    if (key === activeTool) {
      setSnapshotContext({ big_picture: null });
      navigate(`/snapshot/${id}/big_picture`);
    } else {
      setSnapshotContext({ big_picture: key });
      navigate(`/snapshot/${id}/big_picture/${key}`);
    }
  };
  const disabled = (tool: WritingTypeBigPictureTool): boolean => {
    return !tool_config.includes(tool);
  };

  return (
    <div className="h-100 d-flex flex-column overflow-auto">
      <BigPictureButtonToolbar
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
