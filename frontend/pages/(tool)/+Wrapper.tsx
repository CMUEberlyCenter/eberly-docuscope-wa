import {
  type FC,
  type ReactNode,
  useEffect
} from "react";
import { useData } from "vike-react/useData";
import {
  useSetWritingTask,
  WritingTaskProvider
} from "../../src/app/components/WritingTaskContext/WritingTaskContext";
import type { Data } from "./+data";

const DataWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  const data = useData<Data>();
  const setTask = useSetWritingTask();
  useEffect(() => setTask(data), [data, setTask]);
  return <>{children}</>;
};

const Wrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return (<WritingTaskProvider><DataWrapper>{children}</DataWrapper></WritingTaskProvider>);
};
export default Wrapper;
