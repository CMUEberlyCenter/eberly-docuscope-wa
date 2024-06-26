import { FC } from "react";
import Split from "react-split";
import Editor from "./components/Editor/Editor";
import ToolCard from "./components/ToolCard/ToolCard";

const App: FC = () => {
  return (
    <Split
      className="container-fluid h-100 v-100 d-flex flex-row"
      sizes={[80, 20]}
      minSize={[400, 320]}
      expandToMin={true}
    >
      <Editor />
      <ToolCard />
    </Split>
  );
};

export default App;
