import { FC, ReactNode } from "react";
import { ReviewProvider } from "../../../src/app/components/Review/ReviewContext";
import { FileTextProvider } from "../../../src/app/components/FileUpload/FileTextContext";
import { WritingTaskProvider } from "../../../src/app/components/WritingTaskContext/WritingTaskContext";
import { useData } from "vike-react/useData";
import { Data } from "./+data";

export const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const { task, file } = useData<Data>();

  return (
    <WritingTaskProvider initial={{ task, taskId: task.info.id }}>
      <FileTextProvider initial={{ text: file }}>
        <ReviewProvider>{children}</ReviewProvider>
      </FileTextProvider>
    </WritingTaskProvider>
  );
};
