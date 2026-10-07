import { Auth } from "#components/auth/auth.tsx";
import { usePageContext } from "vike-react/usePageContext";

export const Page = () => {
  const { routeParams } = usePageContext();
  return <Auth path={routeParams.view} />;
};
