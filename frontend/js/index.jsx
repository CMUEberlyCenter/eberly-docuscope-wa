import React from "react";
import { createRoot } from "react-dom/client";

import DocuScopeWA from "./DocuScopeWA";
//import DocuScopeSandbox from "./DocuScopeSandbox";

const root = createRoot(document.getElementById('content'));
root.render(<DocuScopeWA />);
//ReactDOM.render(<DocuScopeSandbox />, document.getElementById("content"));
