import { Settings } from "#components/auth/settings/settings.tsx";
import { usePageContext } from "vike-react/usePageContext";

export const Page = () => {
  const {
    routeParams: { view },
  } = usePageContext();
  return <Settings path={view} />;
};
