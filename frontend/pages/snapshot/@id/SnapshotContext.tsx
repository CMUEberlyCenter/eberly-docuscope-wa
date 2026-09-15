import { createContext, Dispatch, FC, ReactNode, use, useReducer } from "react";

type SnapshotContextState = Record<string, string | null>;

const SnapshotContext = createContext<
  [SnapshotContextState, Dispatch<SnapshotContextState>]
>([
  {
    big_picture: null,
    fine_tuning: null,
  },
  () => undefined,
]);
export const useSnapshotContext = () => use(SnapshotContext);

export const SnapshotContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [snapshotContext, setSnapshotContext] = useReducer(
    (state: SnapshotContextState, newState: SnapshotContextState) => {
      return { ...state, ...newState };
    },
    {
      big_picture: null,
      fine_tuning: null,
    }
  );

  return (
    <SnapshotContext value={[snapshotContext, setSnapshotContext]}>
      {children}
    </SnapshotContext>
  );
};
