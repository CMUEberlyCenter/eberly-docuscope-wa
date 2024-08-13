import React from "react";
import { createRoot } from "react-dom/client";
import { DeepLink } from './components/DeepLink/DeepLink';
import "./i18n";
import "./index.scss";


const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <div className="position-relative">
        <DeepLink />
      </div>
    </React.StrictMode>
  );
}
