import { type FC, type ReactNode } from "react";
import { useData } from "vike-react/useData";
import { WritingTaskProvider } from "../../../components/WritingTaskContext/WritingTaskContext";
import type { Data } from "./+data";

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const { task, taskId } = useData<Data>();
  return (
    <WritingTaskProvider initial={{ task, taskId }}>
      {children}
    </WritingTaskProvider>
  );
};
export default Wrapper;
