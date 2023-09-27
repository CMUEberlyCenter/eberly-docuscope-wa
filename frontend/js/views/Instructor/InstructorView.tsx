import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Subscribe, bind } from '@react-rxjs/core';
import React, { ChangeEvent, useEffect, useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import { BehaviorSubject } from "rxjs";
import "../../../css/main.css";
import { launch } from "../../DocuScopeTools";
import { config } from "../../global";
import { courseId } from "../../service/lti.service";
import "./InstuctorView.css";

interface FileInfo {
  id: string;
  filename: string;
  date: string;
  info?: {
    name?: string,
    version?: string,
    author?: string,
    copyright?: string,
    saved?: string,
  };
}
interface FileData<T> {
  status: "success";
  data: T;
}
interface FileError {
  status: "error";
  message: string;
}
type GetFileResponse = FileData<FileInfo[]> | FileError;
type SelectedFileResponse = FileData<{ fileid: string }> | FileError;

const file_list = new BehaviorSubject<FileInfo[] | undefined>(undefined);
const [useFiles, files$] = bind(file_list, null);

async function getFileList(): Promise<void> {
  console.log('getFileList')
  const response = await fetch('/listfiles', {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    }, method: "POST",
  });
  const json = await response.json() as GetFileResponse;
  switch (json.status) {
    case "success":
      file_list.next(json.data);
      return
    case "error":
      console.error(json.message);
      throw (new Error(json.message));
  }
}

if (typeof window !== 'undefined') {
  console.log('top');
  getFileList();
}

const InstructorView = () => {
  const { version } = config;

  const [selected, setSelected] = useState('');
  const files = useFiles();

  useEffect(() => {
    const getfileid = new URL('/getfileid', window.origin);
    getfileid.searchParams.append('course_id', courseId());
    fetch(getfileid, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
    }).then(response => response.json())
      .then((result: SelectedFileResponse) => {
        switch (result.status) {
          case "success":
            setSelected(result.data.fileid);
            return;
          case "error":
            console.error(result.message);
            setSelected('');
            return;
        }
      });
  }, []);

  function onFileSelect(id: string) {
    setSelected(id);
    const url = new URL('/assign', window.origin);
    url.searchParams.append('course_id', courseId());
    url.searchParams.append('id', id);
    fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "GET",
    });
  }
  async function uploadFile(file: File) {
    if (file.size >= 5000000) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      console.warn(`Error: ${file.name} is not a JSON file.`)
      return;
    }
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch("/upload", {
        method: 'POST',
        body: data
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
    [...files ?? []].forEach(file => uploadFile(file));
  }

  function renderFile(file: FileInfo) {
    return (
      <tr key={`file-tr-${file.id}`}>
        <td>
          <Form.Check
            checked={selected === file.id}
            name={'select_file_radio'}
            value={file.id}
            className="ms-3"
            onChange={() => onFileSelect(file.id)}
          />
        </td>
        <td>
          <a href={`/download?id=${file.id}`}>{file.filename}</a>
        </td>
        <td>{new Date(file.date).toLocaleString()}</td>
        <td>
          <ul style={{ listStyleType: 'none' }}>
            <li>Name: {file.info?.name ?? 'unassigned'}</li>
            <li>Version: {file.info?.version ?? '0.0.0'}</li>
            <li>Author: {file.info?.author ?? 'unassigned'}</li>
            <li>Saved: {file.info?.saved ?? 'true'}</li>
            <li>Copyright: {file.info?.copyright ?? 'empty'}</li>
          </ul>
        </td>
      </tr>
    )
  }

  function launchStudent() {
    if (selected === '' || selected === 'global') return;
    launch(true);
  }
  const loading = (<Spinner animation="border" role="status">
    <span className="visually-hidden">Loading...</span>
  </Spinner>);

  return (
    <div tabIndex={0} className="ltiapp">
      <div className="versionlabel">
        Eberly DocuScope Write & Audit version: {version}
      </div>
      <div className="logo">DocuScope Write & Audit</div>
      <div className="dswa-main">
        <div className="loaderbar">
          <button type="button" onClick={() => launchStudent()} className="btn btn-primary" disabled={selected === ''}>
            Open in new window as student
          </button>
          {selected === '' && (<div className="warning">Please select a file below first</div>)}
          <div className="iframe">
            <form id="ltirelayform" target="docuscopewa" method="post"></form>
          </div>
        </div>
        <div className="dswa-instructor">
          <h2>Configuration files for this assignment:</h2>
          <div className="mb-3">
            <label htmlFor="formFile" className="form-label">Upload a file</label>
            <input className="form-control" type="file" id="formFile" onChange={onFileChange} />
          </div>
          <Subscribe source$={files$} fallback={loading}>
            <table className="dswa-table">
              <thead>
                <tr>
                  <th>
                    <button className="btn btn-sm" type="button" onClick={() => getFileList()}>
                      <FontAwesomeIcon icon={faRotate} className="mx-2" />
                    </button>
                  </th>
                  <th>Filename</th>
                  <th>Upload Date</th>
                  <th>Info</th>
                </tr>
              </thead>
              <tbody>
                {files?.map(renderFile)}
              </tbody>
            </table>
          </Subscribe>
        </div>
      </div>
    </div>
  )
}
export default InstructorView;