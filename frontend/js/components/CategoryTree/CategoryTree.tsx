import { bind, Subscribe } from '@react-rxjs/core';
import * as React from 'react';
import { Suspense, useState } from 'react';
import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { ErrorBoundary } from 'react-error-boundary';
import { combineLatest, map } from 'rxjs';
import { CommonDictionary, commonDictionary$, CommonDictionaryTreeNode } from '../../service/common-dictionary.service';
import { gen_patterns_map, TaggerResults, taggerResults$ } from '../../service/tagger.service';
import './CategoryTree.scss';

interface PatternData {
  pattern: string;
  count: number;
}

interface TreeNode {
  parent: string;
  id: string;
  label: string;
  help: string;
  children: TreeNode[];
  patterns: PatternData[];
  checked: CheckboxState;
}

function has_child_data(node: TreeNode): boolean {
  return (node.children.length + node.patterns.length) > 0;
}
function* descendants(node: TreeNode): Generator<TreeNode> {
  yield node;
  for (const child of node.children) {
    yield* descendants(child);
  }
}
function count_patterns(node: TreeNode): number {
  if (node.patterns && node.patterns.length > 0) {
    return node.patterns.reduce((total: number, current: PatternData) => total + current.count, 0);
  } else if (node.children && node.children.length > 0) {
    return node.children.reduce((total: number, child: TreeNode) => total + count_patterns(child), 0);
  }
  return 0;
}

const [useCategoryData] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged: TaggerResults | null = data.tagged;
      const common: CommonDictionary | null = data.common;
      if (common) {
        const cat_pat_map = tagged ? gen_patterns_map(tagged) : new Map();
        const dfsmap = (parent: string, node: CommonDictionaryTreeNode): TreeNode => ({
          parent: parent,
          id: node.id,
          label: node.label,
          help: node.help,
          children: node.children?.map(dfsmap.bind(null, node.id)) ?? [],
          patterns: cat_pat_map.get(node.id) ?? [],
          checked: CheckboxState.Empty,
        });
        return common.tree.map(dfsmap.bind(null, ''));
      }
      return null;
    })
  )
)

enum CheckboxState {
  Empty,
  Indeterminate,
  Checked,
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


const CategoryNode = (props: { data: TreeNode, onChange: (target: TreeNode, state: CheckboxState) => void }) => {
  const checkRef = React.useRef(null);
  const [expanded, setExpanded] = useState(false);
  const checkId = `pattern-check-${props.data.id}`;

  React.useEffect(() => {
    const state = props.data.checked;
    if (checkRef.current) {
      const cb = checkRef.current as HTMLInputElement;
      if (state === CheckboxState.Checked) {
        cb.checked = true;
        cb.indeterminate = false;
      } else if (state === CheckboxState.Empty) {
        cb.checked = false;
        cb.indeterminate = false;
      } else if (state === CheckboxState.Indeterminate) {
        cb.checked = false;
        cb.indeterminate = true;
      }
    }
  });
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
      const state = e.currentTarget.checked ? CheckboxState.Checked : CheckboxState.Empty;
      props.onChange(props.data, state);
  }

  const pattern_count = count_patterns(props.data);
  return (
    <li data-docuscope-category={props.data.id} className='list-group-item'>
      <span className={`material-icons ${has_child_data(props.data) ? '' : 'invisible'}`} onClick={() => setExpanded(!expanded)}>{expanded ? 'expand_more' : 'chevron_right'}</span>
      <div className='form-check d-inline-flex align-items-baseline'>
        <input ref={checkRef} className='form-check-input' id={checkId} type='checkbox' value={props.data.id} onChange={change} disabled={pattern_count === 0} />
        <label className='form-check-label' htmlFor={checkId}>
          {props.data.label}
          <OverlayTrigger overlay={<Tooltip>{props.data.help}</Tooltip>}>
            <span className='material-icons comment mx-1'>comment</span>
          </OverlayTrigger>
        </label>
        {props.data.patterns.length > 0 || !expanded ? (<span className={`badge bg-${pattern_count > 0 ? 'primary' : 'secondary'} rounded-pill fs-6`}>{pattern_count}</span>) : ''}
      </div>
      <div className={expanded ? '' : 'd-none'}>
        {props.data.children.length > 0 ? (<ul className='list-group'>{props.data.children.map(sub => (<CategoryNode key={sub.id} data={sub} onChange={props.onChange} />))}</ul>) : ''}
        {props.data.children.length === 0 && props.data.patterns.length > 0 ? (<Patterns category={props.data.id} data={props.data.patterns} />) : ''}
      </div>
    </li>
  )
};

function parent(node: TreeNode, data: TreeNode[]): TreeNode | undefined {
  if (node.parent !== '') {
    const nodes = data.map(c=>[...descendants(c)]).flat();
    return nodes.find((n) => n.id === node.parent);
  }
  return undefined;
}
const CategoryTreeTop = () => {
  const [refresh, setRefresh] = useState(false); // Hack to force refresh.
  const data: TreeNode[] | null = useCategoryData();

  const onChange = (node: TreeNode, state: CheckboxState) => {
    // all children
    [...descendants(node)].forEach(c=>{ if(count_patterns(c) > 0) {c.checked = state;}});
    // update parents
    let ancestor = parent(node, data??[]);
    while (ancestor) {
      const desc = [...descendants(ancestor)].slice(1);
      if (desc.every((d)=>d.checked === CheckboxState.Checked || count_patterns(d)===0)) {
        ancestor.checked = CheckboxState.Checked;
      } else if (desc.every((d)=>d.checked === CheckboxState.Empty)) {
        ancestor.checked = CheckboxState.Empty;
      } else {
        ancestor.checked = CheckboxState.Indeterminate;
      }
      ancestor = parent(ancestor, data??[]);
    }
    setRefresh(!refresh);
  }
  return (
    <ul className='impressions-category-tree list-group'>
      {data && data.map((cat) => (<CategoryNode key={cat.id} data={cat} onChange={onChange} />))}
    </ul>
  );
}

const ErrorFallback = (props: { error?: Error }) => (
  <div role='alert' className='alert alert-danger'>
    <p>Error loading category information:</p>
    <pre>{props.error?.message}</pre>
  </div>
)
const CategoryTree = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<Spinner animation={'border'} />}>
      <Subscribe>
        <CategoryTreeTop />
      </Subscribe>
    </Suspense>
  </ErrorBoundary>
)
export default CategoryTree;
