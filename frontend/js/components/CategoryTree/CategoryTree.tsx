import * as React from 'react';
import { Suspense } from 'react';
import { Spinner } from 'react-bootstrap';
import { CommonDictionary, CommonDictionaryTreeNode, useCommonDictionary } from '../../service/common-dictionary.service';
import { TaggerResults, useTaggerResults } from '../../service/tagger.service';
import './CategoryTree.css';

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
  <table className='table table-sm patterns'>
    <thead><tr><th scope='col'>Pattern</th><th scope='col'>Count</th></tr></thead>
    <tbody>
      {props.data && props.data.map((pat, i) => (<tr key={`${props.category}-row-${i}`}><td>{pat.pattern}</td><td>{pat.count}</td></tr>))}
    </tbody>
  </table>
)

function count_patterns(node: TreeNode): number {
  if (node.patterns && node.patterns.length > 0) {
    return node.patterns.reduce((total: number, current: PatternData) => total + current.count, 0);
  } else if (node.children && node.children.length > 0) {
    return node.children.reduce((total: number, child: TreeNode) => total + count_patterns(child), 0);
  }
  return 0;
}
const CategoryNode = (props: { data: TreeNode }) => (
  <li data-docuscope-category={props.data.id}><div>{props.data.label}<span className='material-icons comment mx-1' title={props.data.help}>comment</span>
    {props.data.patterns.length > 0 ? (<span className='ms-auto'>{count_patterns(props.data)}</span>) : ''}</div>
    {props.data.children.length > 0 ? (<ul>{props.data.children.map(sub => (<CategoryNode key={sub.id} data={sub} />))}</ul>) : ''}
    {props.data.children.length === 0 && props.data.patterns.length > 0 ? (<Patterns category={props.data.id} data={props.data.patterns} />) : ''}
  </li>
);

const CategoryTreeTop = () => {
  const common: CommonDictionary | null = useCommonDictionary();
  const tagged: TaggerResults | null = useTaggerResults();
  if (common && tagged) {
    const cat_pat_map = new Map<string, PatternData[]>(
      tagged.patterns.map((d) => [d.category, d.patterns ?? []])
    );
    const dfsmap = (node: CommonDictionaryTreeNode): TreeNode => ({
      id: node.id,
      label: node.label,
      help: node.help,
      children: node.children?.map(dfsmap) ?? [],
      patterns: cat_pat_map.get(node.id) ?? []
    });
    const data = common.tree.map(dfsmap);
    return (
      <ul className='impressions-category-tree'>
        {data && data.map((cat) => (<CategoryNode key={cat.id} data={cat} />))}
      </ul>
    );
  }
  return (<Spinner animation={'border'} />)
}

export default () => (<Suspense fallback={<Spinner animation={'border'} />}><CategoryTreeTop /></Suspense>);
