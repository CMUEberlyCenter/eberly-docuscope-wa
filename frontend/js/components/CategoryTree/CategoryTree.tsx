import { bind, Subscribe } from '@react-rxjs/core';
import * as React from 'react';
import { Suspense, useState } from 'react';
import { OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { ErrorBoundary } from 'react-error-boundary';
import { combineLatest, map } from 'rxjs';
import { commonDictionary$, CommonDictionaryTreeNode } from '../../service/common-dictionary.service';
import { gen_patterns_map, taggerResults$ } from '../../service/tagger.service';
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

function has_child_data(node: TreeNode): boolean {
  return (node.children.length + node.patterns.length) > 0;
}

const [useCategoryData] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged = data.tagged;
      const common = data.common;
      if (common) {
        const cat_pat_map = tagged ? gen_patterns_map(tagged) : new Map();
        const dfsmap = (node: CommonDictionaryTreeNode): TreeNode => ({
          id: node.id,
          label: node.label,
          help: node.help,
          children: node.children?.map(dfsmap) ?? [],
          patterns: cat_pat_map.get(node.id) ?? [],
        });
        //category_checked$.next(new Set());
        return common.tree.map(dfsmap);
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
//const category_checked$ = new BehaviorSubject<Set<string>>(new Set());
//const [useChecked] = bind(category_checked$);

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

const CategoryNode = (props: { data: TreeNode, parent_checked?: CheckboxState, onChange?: (target: TreeNode) => void }) => {
  const checkRef = React.useRef(null);
  const [checked, setChecked] = useState(props.parent_checked ?? CheckboxState.Empty);
  //const checked = useChecked();
  const [expanded, setExpanded] = useState(false);
  const checkId = `pattern-check-${props.data.id}`;

  React.useEffect(() => {
    if (checkRef.current) {
      const cb = checkRef.current as HTMLInputElement;
      if (checked === CheckboxState.Checked) {
        cb.checked = true;
        cb.indeterminate = false;
      } else if (checked === CheckboxState.Empty) {
        cb.checked = false;
        cb.indeterminate = false;
      } else if (checked === CheckboxState.Indeterminate) {
        cb.checked = false;
        cb.indeterminate = true;
      }
    }
  }, [checked]);
  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(e.currentTarget.checked ? CheckboxState.Checked : CheckboxState.Empty);
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
        {props.data.children.length > 0 ? (<ul className='list-group'>{props.data.children.map(sub => (<CategoryNode key={sub.id} data={sub} parent_checked={checked}/>))}</ul>) : ''}
        {props.data.children.length === 0 && props.data.patterns.length > 0 ? (<Patterns category={props.data.id} data={props.data.patterns} />) : ''}
      </div>
    </li>
  )
};

const CategoryTreeTop = () => {
  const data: TreeNode[] | null = useCategoryData();
  return (
    <ul className='impressions-category-tree list-group'>
      {data && data.map((cat) => (<CategoryNode key={cat.id} data={cat} />))}
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
