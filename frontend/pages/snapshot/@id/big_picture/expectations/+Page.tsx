import {
  Expectations,
  ExpectationSnapshotProvider,
} from "#components/Review/Expectations";
import { isExpectationsData } from "#lib/ReviewResponse";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses, task } = useData<Data>();

  const getExpectations = () => analyses.filter(isExpectationsData);

  return (
    <ExpectationSnapshotProvider
      snapshotID={id}
      analysis={getExpectations()}
      task={task}
    >
      <Expectations />
    </ExpectationSnapshotProvider>
  );
};
