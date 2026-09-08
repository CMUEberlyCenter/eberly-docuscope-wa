import { Sources, SourcesSnapshotProvider } from "#components/Review/Sources";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <SourcesSnapshotProvider snapshotId={id} analyses={analyses}>
      <Sources />
    </SourcesSnapshotProvider>
  );
};
