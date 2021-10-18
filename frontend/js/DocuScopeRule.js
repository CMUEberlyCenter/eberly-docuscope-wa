
import DocuScopeRuleChild from './DocuScopeRuleChild';
import DataTools from './DataTools';

/**
 *
 */
export default class DocuScopeRule {

  /**
   *
   */
  constructor () {
    let dTools=new DataTools ();

    this.id=dTools.uuidv4 ();
  	this.name="unassigned";
    this.description="unassigned";
    this.type="unassigned";
    this.is_group=false;
    this.cv_description="unassigned";
    this.children=[];
  }
  
  /**
   *
   */
  parse (anObject) {
    console.log ("parse ()");

    this.name=anObject.name;
    this.description=anObject.description;
    this.type=anObject.type;
    this.is_group=anObject.is_group;
    this.cv_description=anObject.cv_description;                

    for (let i=0;i<anObject.children.length;i++) {
      let childObject=anObject.children [i];
      let newChild=new DocuScopeRuleChild();
      newChild.parse (childObject);
      this.children.push (newChild);
    }    
  }
}
