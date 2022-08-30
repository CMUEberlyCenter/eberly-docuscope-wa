
/**
 * 
 */
class TopicHighlighter {
  
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
    var tElements = document.querySelectorAll(".topic");
    for (let i = 0; i < tElements.length; i++) {
      tElements [i].classList.remove("topic-highlight");
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
  highlightTopic (aParagraphIndex, aSentenceIndex, aTopic) {
    console.log ("highlightSentence ("+aParagraphIndex+","+aSentenceIndex+")");

    this.clearAllHighlights ();

    console.log (aTopic);
  }
}

export default TopicHighlighter
