import { FC, ReactNode } from "react";
import { ReviewProvider } from "../../../components/ReviewContext/ReviewContext";
import { FileTextProvider } from "../../../components/FileUpload/FileTextContext";
import { WritingTaskProvider } from "../../../components/WritingTaskContext/WritingTaskContext";
import { useData } from "vike-react/useData";
import { Data } from "./+data";

export const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const { task, segmented } = useData<Data>();

  return (
    <WritingTaskProvider initial={{ task, taskId: task.info.id }}>
      <FileTextProvider initial={{ text: segmented }}>
        <ReviewProvider>{children}</ReviewProvider>
      </FileTextProvider>
    </WritingTaskProvider>
  );
};
