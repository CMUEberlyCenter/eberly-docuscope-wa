import {
  ParagraphClarity,
  ParagraphClaritySnapshotProvider,
} from "#components/Review/ParagraphClarity";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <ParagraphClaritySnapshotProvider snapshotId={id} analyses={analyses}>
      <ParagraphClarity />
    </ParagraphClaritySnapshotProvider>
  );
};
