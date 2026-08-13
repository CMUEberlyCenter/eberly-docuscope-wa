import {
  Sentences,
  SentencesSnapshotProvider,
} from "#components/Review/Sentences";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <SentencesSnapshotProvider snapshotId={id} analyses={analyses}>
      <Sentences />
    </SentencesSnapshotProvider>
  );
};
