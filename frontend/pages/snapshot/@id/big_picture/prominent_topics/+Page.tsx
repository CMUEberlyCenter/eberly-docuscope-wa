import {
  ProminentTopics,
  ProminentTopicsSnapshotProvider,
} from "#components/Review/ProminentTopics";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <ProminentTopicsSnapshotProvider snapshotId={id} analyses={analyses}>
      <ProminentTopics />
    </ProminentTopicsSnapshotProvider>
  );
};
