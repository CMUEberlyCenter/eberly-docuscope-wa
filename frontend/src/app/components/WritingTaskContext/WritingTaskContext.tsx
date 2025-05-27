import {
  createContext,
  type Dispatch,
  type FC,
  type ReactNode,
  useContext,
  useReducer,
} from "react";
import type { WritingTask } from "../../../lib/WritingTask";

type WritingTaskContext = {
  task?: WritingTask | null;
  taskId?: string | null;
};
const WritingTaskContext = createContext<WritingTaskContext>({});
const WritingTaskDispatchContext = createContext<Dispatch<WritingTaskContext>>(
  () => {}
);

export const WritingTaskProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [task, setTask] = useReducer(
    (state: WritingTaskContext, newState: WritingTaskContext) => ({
      ...state,
      ...newState,
    }),
    { task: undefined, taskId: undefined }
  );
  return (
    <WritingTaskContext.Provider value={task}>
      <WritingTaskDispatchContext.Provider value={setTask}>
        {children}
      </WritingTaskDispatchContext.Provider>
    </WritingTaskContext.Provider>
  );
};

export const useWritingTask = () => useContext(WritingTaskContext);
export const useSetWritingTask = () => useContext(WritingTaskDispatchContext);
