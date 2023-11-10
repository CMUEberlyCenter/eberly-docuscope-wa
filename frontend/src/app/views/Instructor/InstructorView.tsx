import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Subscribe, bind } from "@react-rxjs/core";
import React, { ChangeEvent, useEffect, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import { BehaviorSubject } from "rxjs";
import { VERSION } from "../../service/application.service";
import { assignmentId, launch } from "../../service/lti.service";
import "./InstuctorView.scss";

interface FileInfo {
  id: string;
  filename: string;
  date: string;
  info?: {
    name?: string;
    version?: string;
    author?: string;
    copyright?: string;
    saved?: string;
  };
}

const file_list = new BehaviorSubject<FileInfo[] | undefined>(undefined);
const [useFiles, files$] = bind(file_list, null);

async function getFileList(): Promise<void> {
  const response = await fetch("/api/v1/configurations", {
    headers: {
      Accept: "application/json",
    },
    method: "GET",
  });
  if (!response.ok) {
    console.error(`Server error ${response.status} - ${response.statusText}`);
    // TODO show error to user.
  } else {
    const files = (await response.json()) as FileInfo[];
    file_list.next(files);
  }
}

// if (typeof window !== "undefined") {
//   console.log("top");
//   getFileList();
// }

const InstructorView = () => {
  const [selected, setSelected] = useState("");
  const files = useFiles();

  useEffect(() => {
    async function getCurrentFile() {
      await getFileList();
      const getfileid = new URL(
        `/api/v1/assignments/${assignmentId()}/file_id`,
        window.origin
      );
      const response = await fetch(getfileid, {
        headers: {
          Accept: "application/json",
        },
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(
          `Bad current_file request: ${response.status} - ${response.statusText}`
        );
      }
      const { fileid } = (await response.json()) as { fileid: string };
      setSelected(fileid);
    }

    getCurrentFile().catch((err) => {
      console.error(err);
      setSelected("");
    });
  }, []);

  function onFileSelect(id: string) {
    setSelected(id);
    const url = new URL(
      `/api/v1/assignments/${assignmentId()}/assign`,
      window.origin
    );
    fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ id }),
    });
  }
  async function uploadFile(file: File) {
    if (file.size >= 5000000) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      console.warn(`Error: ${file.name} is not a JSON file.`);
      return;
    }
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch("/api/v1/configurations", {
        method: "POST",
        body: data,
      });
      if (response.ok) {
        return getFileList();
      } else {
        console.error(response);
      }
    } catch (err) {
      console.error(err);
    }
  }
  /**
   *
   */
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    [...(files ?? [])].forEach((file) => uploadFile(file));
  }

  function renderFile(file: FileInfo) {
    return (
      <tr key={`file-tr-${file.id}`}>
        <td>
          <Form.Check
            checked={selected === file.id}
            name={"select_file_radio"}
            value={file.id}
            className="ms-3"
            onChange={() => onFileSelect(file.id)}
          />
        </td>
        <td>
          <a
            href={`/api/v1/configurations/${file.id}`}
            download={`${file.filename}`}
          >
            {file.filename}
          </a>
        </td>
        <td>{new Date(file.date).toLocaleString()}</td>
        <td>
          <ul style={{ listStyleType: "none" }}>
            <li>Name: {file.info?.name ?? "unassigned"}</li>
            <li>Version: {file.info?.version ?? "0.0.0"}</li>
            <li>Author: {file.info?.author ?? "unassigned"}</li>
            <li>Saved: {file.info?.saved ?? "true"}</li>
            <li>Copyright: {file.info?.copyright ?? "empty"}</li>
          </ul>
        </td>
      </tr>
    );
  }

  function launchStudent() {
    if (selected === "") return;
    launch(true);
  }
  const loading = (
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );

  return (
    <div tabIndex={0} className="instructor-view d-flex flex-column overflow-hidden h-100 w-100 p-1">
      <div className="versionlabel">
        Eberly DocuScope Write & Audit with myScribe version: {VERSION}
      </div>
      <h1 className="fw-bold flex-grow-0 text-muted">DocuScope Write & Audit with myScribe</h1>
      <div className="d-flex flex-grow-1 flex-column overflow-hidden">
        <div className="px-1 d-flex flex-column align-items-start mb-2">
          <button
            type="button"
            onClick={() => launchStudent()}
            className="btn btn-primary"
            disabled={selected === ""}
          >
            Open in new window as student
          </button>
          {selected === "" && (
            <span className="alert alert-danger" role="alert">Please select a file below first</span>
          )}
          <div className="d-none">
            <form id="ltirelayform" target="docuscopewa" method="post"></form>
          </div>
        </div>
        <div className="border border-secondary flex-grow-1 d-flex flex-column m-0 p-3 overflow-auto">
          <h2>Configuration files for this assignment:</h2>
          <div className="mb-3">
            <label htmlFor="formFile" className="form-label">
              Upload a file
            </label>
            <input
              className="form-control"
              type="file"
              id="formFile"
              onChange={onFileChange}
            />
          </div>
          <Subscribe source$={files$} fallback={loading}>
            <table className="dswa-table">
              <thead>
                <tr>
                  <th>
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={() => getFileList()}
                    >
                      <FontAwesomeIcon icon={faRotate} className="mx-2" />
                    </button>
                  </th>
                  <th>Filename</th>
                  <th>Upload Date</th>
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>{files?.map(renderFile)}</tbody>
            </table>
          </Subscribe>
        </div>
      </div>
    </div>
  );
};
export default InstructorView;
