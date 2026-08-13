import {
  LinesOfArguments,
  LinesOfArgumentsSnapshotProvider,
} from "#components/Review/LinesOfArguments";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <LinesOfArgumentsSnapshotProvider snapshotId={id} analyses={analyses}>
      <LinesOfArguments />
    </LinesOfArgumentsSnapshotProvider>
  );
};
