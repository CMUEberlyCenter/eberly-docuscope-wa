
import DataTools from './DataTools';

/**
 * 
 */
class TopicHighlighter {

  /**
   * 
   */  
  constructor () {
  	this.dataTools=new DataTools ();
  }

  /**
   * 
   */ 
  getParagraphFromId (anId) {
  	console.log ("getParagraphFromId ("+anId+")");

    return (-1);
  }

  /**
   * 
   */ 
  clearAllHighlights () {
    // Select all paragraphs
    var pElements = document.querySelectorAll(".paragraph");
    for (let i = 0; i < pElements.length; i++) {
      pElements [i].classList.remove("paragraph-highlight");
    }

    // Select all sentences
    var sElements = document.querySelectorAll(".sentence");
    for (let i = 0; i < sElements.length; i++) {
      sElements [i].classList.remove("sentence-highlight");
    }

    // Select all topics
    var tElements = document.querySelectorAll(".word");
    for (let i = 0; i < tElements.length; i++) {
      tElements [i].classList.remove("word-highlight");
    }    
  }

  /**
   * 
   */
  highlightParagraph (aParagraphIndex) {
  	console.log ("highlightParagraph ("+aParagraphIndex+")");

  	this.clearAllHighlights ();
    
    let pId="p"+(aParagraphIndex+1);

    let pElement=document.getElementById (pId);
    if (pElement!=null) {
      console.log ("Paragraph element found");
      pElement.classList.add("paragraph-highlight");
    } else {
      console.log ("Unable to find paragraph element");
    }
  }

  /**
   * 
   */
  highlightSentence (aParagraphIndex, aSentenceIndex) {
    console.log ("highlightSentence ("+aParagraphIndex+","+aSentenceIndex+")");

    this.clearAllHighlights ();

    let pId="p"+(aParagraphIndex+1);

    let pElement=document.getElementById (pId);
    if (pElement!=null) {
      pElement.classList.add("paragraph-highlight");
    } else {
      console.log ("Unable to find paragraph element");
      return;
    }

    let sId="p"+(aParagraphIndex+1)+"s"+(aSentenceIndex+1);

    let sElement=document.getElementById (sId);
    if (sElement!=null) {
      sElement.classList.add("sentence-highlight");
    } else {
      console.log ("Unable to find sentence element");
    }        
  }

  /**
   * 
   */
  highlightTopic (aParagraphIndex, aSentenceIndex, aTopicList) {
    console.log ("highlightTopic ("+aParagraphIndex+","+aSentenceIndex+")");

    this.clearAllHighlights ();

    let paragraphElement=document.getElementById ("p"+(aParagraphIndex+1));

    let topicElements=[];
    if (paragraphElement) {
      topicElements=paragraphElement.getElementsByClassName ("word");
    } else {
      topicElements=document.getElementsByClassName ("word");
    }

    let testElements=[];
    for (let i=0;i<topicElements.length;i++) {
      testElements.push (topicElements [i].innerHTML);
    }

    if ((aParagraphIndex==-1) && (aSentenceIndex==-1)) {
      for (let i=0;i<topicElements.length;i++) {
      	let anElement=topicElements [i];

        for (let j=0;j<aTopicList.length;j++) {
          if (anElement.innerHTML.toLowerCase ()==aTopicList [j].toLowerCase()) {
          	anElement.classList.add("word-highlight");
          }
        }
      }
    } else {
      // This is a really bad and slow way of doing this!
      for (let i=0;i<topicElements.length;i++) {
        let anElement=topicElements [i];

        for (let j=0;j<aTopicList.length;j++) {
          if (aSentenceIndex==-1) {	      
	        if (anElement.innerHTML.toLowerCase ()==aTopicList [j].toLowerCase()) {	        
              anElement.classList.add("word-highlight");
            }
          } else {
	      	if (j==aSentenceIndex) {
	          if (anElement.innerHTML.toLowerCase ()==aTopicList [j].toLowerCase()) {	        
                anElement.classList.add("word-highlight");
	          }
	        }
	      }
	    }	    
      }
    }
  }
}

export default TopicHighlighter
