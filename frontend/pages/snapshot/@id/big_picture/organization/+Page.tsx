import {
  Organization,
  OrganizationSnapshotProvider,
} from "#components/Review/Organization";
import { FC } from "react";
import { useData } from "vike-react/useData";
import { Data } from "../../+data";

export const Page: FC = () => {
  const { id, analyses } = useData<Data>();
  return (
    <OrganizationSnapshotProvider snapshotId={id} analyses={analyses}>
      <Organization />
    </OrganizationSnapshotProvider>
  );
};
