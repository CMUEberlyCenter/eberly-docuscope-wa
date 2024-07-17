import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import CustomEditor from "./components/Editor/CustomEditor";
import "./i18n";
import "./index.scss";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <StrictMode>
      <Suspense fallback="loading">
        <CustomEditor />
      </Suspense>
    </StrictMode>
  );
}
