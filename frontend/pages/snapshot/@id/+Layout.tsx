import "#components/Review/Review.scss";
import {
  ReviewToolCategoryNav,
  ToolCategory,
} from "#components/ReviewNavigation/ReviewToolCategoryNav";
import { TaskViewerButton } from "#components/TaskViewer/TaskViewer";
import { UneditableIcon } from "#components/UneditableIcon/UneditableIcon";
import { UserText } from "#components/UserTextView/UserText";
import { SplitLayout } from "#layouts/SplitLayout";
import { ToolLayout } from "#layouts/ToolLayout";
import { Activity, FC, ReactNode } from "react";
import Placeholder from "react-bootstrap/esm/Placeholder";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "./+data";
import { useSnapshotContext } from "./SnapshotContext";

type SnapshotLayoutProps = {
  children: ReactNode;
};

export const Layout: FC<SnapshotLayoutProps> = ({ children }) => {
  const { t } = useTranslation("review");
  const { file, filename } = useData<Data>();
  const [snapshotContext] = useSnapshotContext();
  const pageContext = usePageContext();
  const id = pageContext.routeParams.id as string;
  const match = pageContext.urlPathname.match(/\/snapshot\/[^/]+\/([^/]+)/);
  const activeTab = (match?.at(1) as ToolCategory) ?? "big_picture";

  const onSelect = (key: string | null) => {
    if (key) {
      if (key in snapshotContext && snapshotContext[key]) {
        navigate(`/snapshot/${id}/${key}/${snapshotContext[key]}`);
      } else {
        navigate(`/snapshot/${id}/${key}`);
      }
    }
  };
  return (
    <SplitLayout>
      <main className={"d-flex flex-column my-1"}>
        <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
          <span>{filename}</span>
          <TaskViewerButton />
          <UneditableIcon />
        </header>
        <Activity mode={!file ? "visible" : "hidden"}>
          <Placeholder as="p" animation="glow" className="p-2">
            <Placeholder
              className="w-100 rounded"
              style={{ height: "10rem" }}
            />
            <Placeholder
              className="w-100 rounded my-2"
              style={{ height: "10rem" }}
            />
            <Placeholder
              className="w-100 rounded"
              style={{ height: "10rem" }}
            />
          </Placeholder>
        </Activity>
        <Activity mode={file ? "visible" : "hidden"}>
          <UserText className="overflow-auto border-top flex-grow-1" />
        </Activity>
      </main>
      <ToolLayout stage={t("snapshot")}>
        <ReviewToolCategoryNav activeKey={activeTab} onSelect={onSelect} />
        {children}
      </ToolLayout>
    </SplitLayout>
  );
};
