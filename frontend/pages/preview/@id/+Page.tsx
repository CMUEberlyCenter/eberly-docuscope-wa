import { Activity, FC } from "react";
import { Placeholder } from "react-bootstrap";
import { useData } from "vike-react/useData";
import { SplitLayout } from "../../../layouts/SplitLayout";
import { Review } from "../../../src/app/components/Review/Review";
import { TaskViewerButton } from "../../../src/app/components/TaskViewer/TaskViewer";
import { UneditableIcon } from "../../../src/app/components/UneditableIcon/UneditableIcon";
import { UserText } from "../../../src/app/components/UserTextView/UserText";
import { Data } from "./+data";

export const Page: FC = () => {
  const { filename, file } = useData<Data>();
  return <SplitLayout>
    <main className={"d-flex flex-column my-1"}>
      <header className="d-flex justify-content-between align-items-center border rounded-top bg-light px-3">
        <span>{filename}</span>
        <TaskViewerButton />
        <UneditableIcon />
      </header>
      <Activity mode={!file ? 'visible' : 'hidden'}>
        <Placeholder as="p" animation="glow" className="p-2">
          <Placeholder className="w-100 rounded" style={{ height: "10rem" }} />
          <Placeholder className="w-100 rounded my-2" style={{ height: "10rem" }} />
          <Placeholder className="w-100 rounded" style={{ height: "10rem" }} />
        </Placeholder>
      </Activity>
      <Activity mode={file ? 'visible' : 'hidden'}>
        <UserText className="overflow-auto border-top flex-grow-1" />
      </Activity>
    </main>
    <Review />
  </SplitLayout>;
};
