import { UserButton } from "#components/auth/user/user-button.tsx";
import CustomEditor from "#components/Editor/CustomEditor";
import type { FC } from "react";

const Page: FC = () => {
  return <CustomEditor user={<UserButton className="rounded" size="icon" />} />;
};
export default Page;
