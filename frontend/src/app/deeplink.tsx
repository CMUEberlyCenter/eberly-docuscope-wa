import React from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import InstructorView from "./views/Instructor/InstructorView";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <div className="position-relative">
        <InstructorView />
      </div>
    </React.StrictMode>
  );
}
