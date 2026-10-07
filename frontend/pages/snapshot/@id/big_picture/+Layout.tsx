import {
  BigPictureButtonToolbar,
  BigPictureTool,
} from "#components/ReviewNavigation/BigPictureButtonToolbar";
import { FC, ReactNode } from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import { navigate } from "vike/client/router";
import { Data } from "../+data";
import { useSnapshotContext } from "../SnapshotContext";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { routeParams, urlPathname } = usePageContext();
  const [, setSnapshotContext] = useSnapshotContext();
  const { task, tool_config } = useData<Data>();
  const id = routeParams.id as string;
  const match = urlPathname.match(/\/snapshot\/[^/]+\/big_picture\/([^/]+)/);
  const activeTool = (match?.at(1) as BigPictureTool) ?? null;
  const onSelect = (key: BigPictureTool) => {
    if (key === activeTool) {
      setSnapshotContext({ big_picture: null });
      navigate(`/snapshot/${id}/big_picture`);
    } else {
      setSnapshotContext({ big_picture: key });
      navigate(`/snapshot/${id}/big_picture/${key}`);
    }
  };

  return (
    <div className="tw:h-full tw:flex tw:flex-col tw:overflow-auto">
      <BigPictureButtonToolbar
        activeTool={activeTool}
        onSelect={onSelect}
        task={task}
        enabled={tool_config}
      />
      {children}
    </div>
  );
};
