import React, { Component } from 'react';

//import { Alert } from "react-bootstrap";

import '../../../css/main.css';
import '../../../css/filestyles.css';
import './InstuctorView.css';

import { faRotate } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import EberlyLTIBase from '../../EberlyLTIBase';
import DocuScopeTools from '../../DocuScopeTools';
import DocuScopeWAScrim from '../../DocuScopeWAScrim';

/**
 * Yes I will probably move this over to the new format. To meet the deadline I will use a class for now
 */
/* 
const InstuctorView = () => (
  <div tabIndex="0" className="ltiapp">
    <div className="logo">
    DocuScope Write & Audit
    </div>
    <div className="dswa-main">
    </div>
    {scrim}
  </div>);
*/  

/**
 * 
 */
class InstuctorView extends EberlyLTIBase {

  /**
   * 
   */
  constructor (props) {
    super(props);

    this.state={
      uploading: true,
      files: [],
      selected: "",
      version: "0.9.5"
    };

    this.dTools=new DocuScopeTools ();

    this.onLaunch=this.onLaunch.bind(this);

    this.onFileChange=this.onFileChange.bind(this);
    this.uploadProgress=this.uploadProgress.bind(this);
    this.uploadComplete=this.uploadComplete.bind(this);
    this.dragOverHandler=this.dragOverHandler.bind(this);
    this.dropHandler=this.dropHandler.bind(this);    
    this.getFiles=this.getFiles.bind(this);
    this.onFileSelectionChanged=this.onFileSelectionChanged.bind(this);
  }

  /**
   *
   */
  componentDidMount () {
    console.log ("componentDidMount ()");
  
    this.getFiles ();
  }

  /**
   * 
   */
  getFiles () {
    console.log ("getFiles ()");

    let that=this;

    fetch("/listfiles",{
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST"
    }).then(resp => resp.text()).then((result) => {
      let raw=JSON.parse(result);
      let course_id=that.dTools.getCourseId ();

      that.setState ({
        files: raw.data
      },() => {
        fetch("/getfileid?course_id="+course_id,{
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          method: "POST"
        }).then(resp => resp.text()).then((result) => {
          let raw=JSON.parse(result);
          console.log (raw);
          if (raw.data.fileid!="global") {
            that.setState ({
              selected: raw.data.fileid
            });
          }
        });
      });
    });
  }

  /**
   * 
   */
  onLaunch (e) {
    console.log ("onLaunch ("+this.state.selected+")");

    if ((this.state.selected=="") || (this.state.selected=="global")) {
      console.log ("There is no file selected for this assignment. Please upload or select a file below first");
      return;
    }

    let docuscopeTools=new DocuScopeTools ();
    docuscopeTools.launch (true);
  }

  /**
   * https://docs.jboss.org/author/display/WFLY8/Undertow+subsystem+configuration
   */
  uploadFile(aFile){
    console.log ("uploadFile ()");

    console.log ("Checking upload size: " + aFile.size + " ...");

    if (aFile.size>=5000000) {
      //$("#uploadlabel").text ("Error: you can only upload files of 5 megabytes or less");
      return;
    }

    let lower=aFile.name.toLowerCase();
    let validExtension=false;

    if (aFile.name.toLowerCase().indexOf (".json")!=-1) {
      validExtension=true;
    }

    if (validExtension==false) {
      console.log("Error: the file " + aFile.name + " is not a JSON file");
      return;
    }

    let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let d = new Date();
    let creationDate=d.toLocaleDateString("en-US", options);

    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);

    let url = '/upload';
    let fd = new FormData();
    fd.append("file", aFile);
    fd.append("date",creationDate);
    fd.append("timezone",Intl.DateTimeFormat().resolvedOptions().timeZone);

    for (let setting in this.state.settings) {
      if (this.state.settings.hasOwnProperty(setting)) {
        //docdebug ("Adding extra file info: " + setting + " -> " + settings[setting]);
        fd.append(setting,this.state.settings[setting]);
      }
    }

    let xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", this.uploadProgress, false);
    xhr.addEventListener("load", this.getFiles, false);      
    xhr.open("POST", url, true);
    xhr.send(fd);

    this.setState ({
      uploading: true
    });
  }

  /**
   *
   */
  uploadProgress(event) {
    // Note: doesn't work with async=false.
    let progress = Math.round(event.loaded / event.total * 100);

    console.log ("Progress " + progress + "%");

    if (progress==100) {
      //this.refresh ();
      return;
    }
  }

  /**
   *
   */
  uploadComplete(event) {
    console.log ("uploadComplete ()");

    /*
    let json=null;

    try {
      json=JSON.parse (event.currentTarget.response);
    } catch (error) {
    }
    */
  }

  /**
   *
   */
  onFileChange (event) {
    console.log ("onFileChange()");

    let files=event.target.files;

    // Use DataTransfer interface to access the file(s)
    console.log ("Uploading " + files.length +  " files ...");

    for (var i = 0; i < files.length; i++) {
      let targetFile=files[i];
      console.log ('... file[' + i + '].name = ' + targetFile.name);
      this.uploadFile (targetFile);
    }
  }

  /**
  *
  */
  dropHandler (event) {
    console.log  ("dropHandler ()");

    event.preventDefault();
    event.stopPropagation();

    if (typeof this.state.settings !== 'undefined') {
      if (event.dataTransfer.items) {
        console.log  ("Uploading " + event.dataTransfer.items.length +  " files ...");

        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < event.dataTransfer.items.length; i++) {

          // If dropped items aren't files, reject them
          if (event.dataTransfer.items[i].kind === 'file') {
            let targetFile = event.dataTransfer.items[i].getAsFile();
            console.log ('... file[' + i + '].name = ' + targetFile.name);
            this.uploadFile (targetFile);
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        console.log  ("Uploading " + event.dataTransfer.files.length +  " files ...");

        for (let i = 0; i < event.dataTransfer.files.length; i++) {
          let targetFile=event.dataTransfer.files[i];
          console.log ('... file[' + i + '].name = ' + targetFile.name);
          this.uploadFile (targetFile);
        }
      }
    }

    // Pass event to removeDragData for cleanup
    this.removeDragData(event);
  }

  /**
  * Prevent default behavior (Prevent file from being opened)
  */
  dragOverHandler (event) {
    //docdebug('dragOverHandler ()'); 
    event.preventDefault();
  }    

  /**
   * Use the parent API call instead!
   */
  onFileSelectionChanged (e) {
    let course_id=this.dTools.getCourseId ();

    this.setState ({
      selected: e.currentTarget.value
    },() => {
      fetch("/assign?course_id="+course_id+"&id="+this.state.selected,{
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        method: "GET"
      });      
    });
  }

  /**
   *
   */
  showLoader () {
    if (this.state.selected=="") {
      return (<div className="loaderbar">
        <button id="launcher" className="inline_button">Open in new Window (as student)</button>
        <div className="warning">Please select a file below first</div>
        <div className="iframe">
          <form id="ltirelayform" target="docuscopewa" method="post"></form>
        </div>
      </div>);
    }

    return (<div className="loaderbar">
      <button id="launcher" className="inline_button" onClick={(e) => this.onLaunch (e)}>Open in new Window (as student)</button>
      <div className="iframe">
        <form id="ltirelayform" target="docuscopewa" method="post"></form>
      </div>
    </div>);
  }  

  /**
   *
   */
  generateUploadElement () {
    return (<div id="filecontainer" htmlFor="file" className="dropcontainer">
      <div className="box">
        <input type="file" id="file" multiple={false} className="inputfile inputfile-4" onChange={this.onFileChange} />
        <label htmlFor="file"
          onDrop={this.dropHandler}
          onDragOver={this.dragOverHandler}
          onChange={this.onFileChange}>
          <figure>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17" viewBox="0 0 20 17">
             <path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"/></svg>
          </figure> 
          <span id="uploadlabel">Choose a file</span>
        </label>
      </div>
    </div>);
  }

  /**
   * 
   */
  generateFileListing () {
    let files=[];

    for (let i=0;i<this.state.files.length;i++) {
      let file=this.state.files[i];
      let infoString=file.info;

      console.log ("infoString: " + file.info);

      let decoded=atob(infoString);

      console.log ("decoded: " + decoded);

      let unescaped=unescape(decoded);

      console.log ("unescaped: " + unescaped);

      let info={
        name: "unassigned",
        version: "0.0.0",
        author: "unassigned"
        saved: true,
        copyright: "empty"
      };

      if (unescaped!="undefined") {
        info=JSON.parse (unescaped);
      }

      let infoList=<ul style={{listStyleType: "none"}}>
        <li>{"Name: " + info.name}</li>
        <li>{"Version: " + info.version}</li>
        <li>{"Author: " + info.author}</li>
        <li>{"Saved: " + info.saved}</li>
        <li>{"Copyright: " + info.copyright}</li>
      </ul>;

      files.push(<tr key={"file-tr-"+file.id}><td><label><input id={file.id} type="radio" value={file.id} checked={this.state.selected === file.id} onChange={(e) => this.onFileSelectionChanged (e,file.id)} style={{marginLeft: "4px"}} /></label></td><td><a href={"/download?id="+file.id}>{file.filename}</a></td><td>{file.date}</td><td>{infoList}</td></tr>); 
    }

    return (<table className="dswa-table">
        <thead>
          <tr>
            <th>
              <div onClick={(e) => this.getFiles (e)}><FontAwesomeIcon icon={faRotate} style={{ marginLeft: "2px", marginRight: "2px" }} /></div>
            </th>
            <th>Filename</th>
            <th>Upload Date</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
          {files}
        </tbody>
      </table>);
  }

  /**
   * 
   */
  render () {
    let loader=this.showLoader ();
    let fileuploader=this.generateUploadElement ();
    let filelisting=this.generateFileListing ();

    return (<div tabIndex={0} className="ltiapp">
      <div className="versionlabel">Eberly DocuScope Write & Audit version: {this.state.version}</div>
      <div className="logo">
      DocuScope Write & Audit
      </div>
      <div className="dswa-main">
        {loader}
        <div className="dswa-instructor">
          <h2>Configuration files for this assignment:</h2>        
          {fileuploader}
          {filelisting}
        </div>
      </div>
    </div>);
  }
}

export default InstuctorView;
