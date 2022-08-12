import React, { Component } from 'react';

//import { Alert } from "react-bootstrap";

import '../../../css/main.css';
import '../../../css/filestyles.css';
import './InstuctorView.css';

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

    //this.docuscopeTools=new DocuScopeTools ();
    this.state={
      uploading: true
    };

    this.onLaunch=this.onLaunch.bind(this);

    this.onFileChange=this.onFileChange.bind(this);
    this.uploadProgress=this.uploadProgress.bind(this);
    this.uploadComplete=this.uploadComplete.bind(this);
    this.dragOverHandler=this.dragOverHandler.bind(this);
    this.dropHandler=this.dropHandler.bind(this);    
  }

  /**
   * 
   */
  onLaunch (e) {
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

    if ((aFile.name.toLowerCase().indexOf (".xlsx")!=-1) || (aFile.name.toLowerCase().indexOf (".csv")!=-1)) {
      validExtension=true;
    }

    if (validExtension==false) {
      console.log("Error: the file " + aFile.name + " is neither an XLSX file nor a CSV file");
      return;
    }

    //settings ["ownedby"]="instructor"; // Uploaded by instructor

    let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let d = new Date();
    let creationDate=d.toLocaleDateString("en-US", options);

    console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);

    let url = '/lti/coursenav/catme/upload';
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
    xhr.addEventListener("load", this.uploadComplete, false);      
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
      this.setState({
        scrimUp: true,
        scrimMessage: "Error parsing uploaded file. Please contact the system administrator at eberly-assist@andrew.cmu.edu",
        scrimExtended: error
      });
      console.log (error);
      return;
    }

    if (json==null) {
      return;
    }

    let cleaned=this.CATMETools.prepIncomingData (json);

    console.log (cleaned);

    this.setState ({
      uploading: false,
      pre: cleaned
    });
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
   *
   */
  showLoader () {
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
        <input type="file" id="file" className="inputfile inputfile-4" onChange={this.onFileChange} />
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
    return (<table className="dswa-table">
        <thead>
          <tr>
            <th><label><input type="checkbox" checked={true} /></label>Active</th>
            <th>Filename</th>
            <th>Upload Date</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><label><input type="checkbox" checked={true} /></label></td><td>rules.json</td><td>August 12th, 2022</td></tr>
          <tr><td><label><input type="checkbox" checked={true} /></label></td><td>values.json</td><td>August 12th, 2022</td></tr>
          <tr><td><label><input type="checkbox" checked={true} /></label></td><td>info.json</td><td>August 12th, 2022</td></tr>
          <tr><td><label><input type="checkbox" checked={true} /></label></td><td>impressions.json</td><td>August 12th, 2022</td></tr>
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
