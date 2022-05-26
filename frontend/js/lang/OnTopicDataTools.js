
/**
 *
 */
class OnTopicDataTools {

  /**
   * 
   */
  isEmpty (aDataSet) {
    for (let i=0;i<aDataSet.length;i++) {
      if (aDataSet [i]!=-1) {
      	return (false);
      }
    }

    return (true);
  }

  /**
   * 
   */
  countParagraphs (aDataSet) {
    let count=0;

    if (aDataSet==null) {
      return (count);
    }

    if (aDataSet.length<2) {
      return (count);
    }

    let up=false;

    // Skip the first object since it contains the global topic list
    for (let i=1;i<aDataSet.length;i++) {
      if (this.isEmpty (aDataSet [i])==false) {
      	// We only count the transition from going into a line that has valid data
      	if (up==false) {
      	  count++;
      	}
      	up=true;
      } else {
      	up=false;
      }
    }
    
    return (count);
  }
}

export default OnTopicDataTools;
