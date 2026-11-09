import { AssignmentProvider } from "#components/AssignmentContext/AssignmentContext.tsx";
import { UserProvider } from "#components/UserContext/UserContext.tsx";
import { WritingTaskProvider } from "#components/WritingTaskContext/WritingTaskContext";
import { type FC, type ReactNode } from "react";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const data = useData<Data>();
  return (
    <AssignmentProvider initial={{ activityTitle: data.activityTitle }}>
      <UserProvider initial={data.user}>
        <WritingTaskProvider initial={data}>{children}</WritingTaskProvider>
      </UserProvider>
    </AssignmentProvider>
  );
};
export default Wrapper;
