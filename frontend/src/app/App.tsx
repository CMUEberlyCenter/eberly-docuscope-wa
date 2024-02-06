// import React, { useState } from "react";
// import { Button } from "react-bootstrap";
// import { useIdleTimer } from "react-idle-timer";
import { isInstructor, launch } from "./service/lti.service";
import InstructorView from "./views/Instructor/InstructorView";
import StudentView from "./views/Student/StudentView";

// const Timeout = 10000; //5 * 60 * 1000;

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (_e) {
    return true;
  }
}

// Idle timer does not make sense for this as it does not
// depend on active session management with host.
// type State = "ACTIVE" | "IDLE" | "PROMPT";
const App = () => {
  // const [state, setState] = useState<State>("ACTIVE");
  // useIdleTimer({
  //   timeout: Timeout,
  //   //promptBeforeIdle: 10 * 1000,
  //   onIdle: () => setState("IDLE"),
  //   //onPrompt: () => setState('PROMPT'),
  //   onActive: () => setState("ACTIVE"),
  //   stopOnIdle: true,
  // });
  // const lockout = (
  //   <div
  //     id="lockout"
  //     className={`position-fixed top-0 start-0 vh-100 vw-100`}
  //     tabIndex={-1}
  //     style={{ display: ["IDLE"].includes(state) ? "block" : "none" }}
  //   >
  //     <div className="modal-backdrop show" />
  //     <div className="modal show" style={{ display: "block" }}>
  //       <div className="modal-dialog">
  //         <div className="modal-content">
  //           <div className="modal-header">
  //             <h5 className="modal-title">
  //               Session Timeout {state === "PROMPT" && "Warning"}
  //             </h5>
  //           </div>
  //           <div className="modal-body">
  //             <p>
  //               Your session{" "}
  //               {state === "PROMPT"
  //                 ? "is about to time out."
  //                 : "has timed out, please reload this page."}
  //             </p>
  //           </div>
  //           <div className="modal-footer">
  //             <Button color="primary" onClick={() => location.reload()}>
  //               Reload
  //             </Button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // );

  if (isInstructor()) {
    return (
      <div className="position-relative">
        <InstructorView />
      </div>
    );
  }

  if (inIframe()) {
    return (
      <div className="loader">
        <button
          id="launcher"
          className="center_button"
          onClick={() => launch(false)}
        >
          Open in new Window
        </button>
        <div className="iframe">
          <form id="ltirelayform" target="docuscopewa" method="post"></form>
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative">
      <StudentView />
      {/* {lockout} */}
    </div>
  );
};

export default App;
