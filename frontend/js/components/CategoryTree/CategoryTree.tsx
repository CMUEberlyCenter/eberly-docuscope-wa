import * as React from 'react';
import { Suspense, useState } from 'react';
import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { CommonDictionary, CommonDictionaryTreeNode, useCommonDictionary } from '../../service/common-dictionary.service';
import { gen_patterns_map, TaggerResults, useTaggerResults } from '../../service/tagger.service';
import './CategoryTree.scss';

interface PatternData {
  pattern: string;
  count: number;
}

interface TreeNode {
  id: string;
  label: string;
  help: string;
  children: TreeNode[];
  patterns: PatternData[];
}

const Patterns = (props: { category: string, data: PatternData[] }) => (
  <div className='table-responsive patterns-container ms-5'>
    <table className='table table-sm patterns overflow-auto'>
      <thead className='header'><tr><th scope='col'>Pattern</th><th scope='col' className='text-end'>Count</th></tr></thead>
      <tbody>
        {props.data && props.data.map((pat, i) => (<tr key={`${props.category}-row-${i}`}><td>{pat.pattern}</td><td className='text-end pe-3'>{pat.count}</td></tr>))}
      </tbody>
    </table>
  </div>
)

function count_patterns(node: TreeNode): number {
  if (node.patterns && node.patterns.length > 0) {
    return node.patterns.reduce((total: number, current: PatternData) => total + current.count, 0);
  } else if (node.children && node.children.length > 0) {
    return node.children.reduce((total: number, child: TreeNode) => total + count_patterns(child), 0);
  }
  return 0;
}
const CategoryNode = (props: { data: TreeNode }) => {
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const check = `pattern-check-${props.data.id}`;
  return (
    <li data-docuscope-category={props.data.id} className='list-group-item'>
      <span className='material-icons' onClick={() => setExpanded(!expanded)}>{expanded ? 'expand_more' : 'chevron_right'}</span>
      <div className='form-check d-inline-flex align-items-baseline'>
        <input className='form-check-input' id={check} type='checkbox' value={props.data.id} checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)}/>
        <label className='form-check-label' htmlFor={check}>
          {props.data.label}
          <OverlayTrigger overlay={<Tooltip>{props.data.help}</Tooltip>}>
            <span className='material-icons comment mx-1'>comment</span>
          </OverlayTrigger>
        </label>
        {props.data.patterns.length > 0 || !expanded ? (<span className='badge bg-primary rounded-pill fs-6'>{count_patterns(props.data)}</span>) : ''}
      </div>
      <div className={expanded ? '' : 'd-none'}>
        {props.data.children.length > 0 ? (<ul className='list-group'>{props.data.children.map(sub => (<CategoryNode key={sub.id} data={sub} />))}</ul>) : ''}
        {props.data.children.length === 0 && props.data.patterns.length > 0 ? (<Patterns category={props.data.id} data={props.data.patterns} />) : ''}
      </div>
    </li>
  )
};

const CategoryTreeTop = () => {
  const common: CommonDictionary | null = useCommonDictionary();
  const tagged: TaggerResults | null = useTaggerResults();
  if (common && tagged) {
    const cat_pat_map = gen_patterns_map(tagged);
    const dfsmap = (node: CommonDictionaryTreeNode): TreeNode => ({
      id: node.id,
      label: node.label,
      help: node.help,
      children: node.children?.map(dfsmap) ?? [],
      patterns: cat_pat_map.get(node.id) ?? []
    });
    const data = common.tree.map(dfsmap);
    return (
      <ul className='impressions-category-tree list-group'>
        {data && data.map((cat) => (<CategoryNode key={cat.id} data={cat} />))}
      </ul>
    );
  }
  return (<Spinner animation={'border'} />)
}

const CategoryTree = () => (<Suspense fallback={<Spinner animation={'border'} />}><CategoryTreeTop /></Suspense>);
export default CategoryTree;
