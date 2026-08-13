import {
  ProfessionalTone,
  ProfessionalToneSnapshotProvider,
} from "#components/Review/ProfessionalTone";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <ProfessionalToneSnapshotProvider snapshotId={id} analyses={analyses}>
      <ProfessionalTone />
    </ProfessionalToneSnapshotProvider>
  );
};
