import {
  LogicalFlow,
  LogicalFlowSnapshotProvider,
} from "#components/Review/LogicalFlow";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <LogicalFlowSnapshotProvider snapshotId={id} analyses={analyses}>
      <LogicalFlow />
    </LogicalFlowSnapshotProvider>
  );
};
