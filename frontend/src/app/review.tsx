import React from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import { ListGroup } from "react-bootstrap";

const content = document.getElementById("content");
console.assert(content, '"#content" not found!  Unable to render application.');
if (content) {
  createRoot(content).render(
    <React.StrictMode>
      <h1>TBD</h1>
      <ListGroup>
        <ListGroup.Item>
          Logical Progression Issues
        </ListGroup.Item>
        <ListGroup.Item>
          List of Key Ideas
        </ListGroup.Item>
        <ListGroup.Item>
          Lines of Arguments
        </ListGroup.Item>
        <ListGroup.Item>
          Reader Expectations
        </ListGroup.Item>
        <ListGroup.Item>
          Organization (Term Matrix)
          {/* Coherence */}
        </ListGroup.Item>
      </ListGroup>
    </React.StrictMode>
  );
}
