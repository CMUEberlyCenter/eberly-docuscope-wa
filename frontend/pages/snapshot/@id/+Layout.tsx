import { Activity, FC, ReactNode } from "react";
import Placeholder from "react-bootstrap/esm/Placeholder";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { Legal } from "../../../components/Legal/Legal";
import { StageHeader } from "../../../components/StageHeader/StageHeader";
import { TaskViewerButton } from "../../../components/TaskViewer/TaskViewer";
import { UneditableIcon } from "../../../components/UneditableIcon/UneditableIcon";
import { UserText } from "../../../components/UserTextView/UserText";
import { SplitLayout } from "../../../layouts/SplitLayout";
import { Data } from "./+data";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation("review");
  const { file, filename } = useData<Data>();
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
      <aside className="my-1 border rounded bg-light d-flex flex-column">
        <StageHeader title={t("snapshot")} />
        {children}
        <Legal />
      </aside>
    </SplitLayout>
  );
};
