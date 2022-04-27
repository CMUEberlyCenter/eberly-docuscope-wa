/* Component for displaying the common dictionary tree and pattern counts.

This is part of the visualization (Impressions) of DocuScope tagged data.
The tree view sums the number of instances for all subcategories when collapsed.
*/
import { bind, Subscribe } from "@react-rxjs/core";
import * as d3 from "d3";
import * as React from "react";
import {
  ChangeEvent,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Collapse, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { Transition } from "react-transition-group";
import { combineLatest, map } from "rxjs";
import {
  CommonDictionary,
  commonDictionary$,
  CommonDictionaryTreeNode,
} from "../../service/common-dictionary.service";
import { useEditorState } from "../../service/editor-state.service";
import {
  gen_patterns_map,
  TaggerResults,
  taggerResults$,
} from "../../service/tagger.service";
import "./CategoryTree.scss";

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
  return node.children.length + node.patterns.length > 0;
}
function* descendants(node: TreeNode): Generator<TreeNode> {
  yield node;
  for (const child of node.children) {
    yield* descendants(child);
  }
}
function count_patterns(node: TreeNode): number {
  if (node.patterns && node.patterns.length > 0) {
    return node.patterns.reduce(
      (total: number, current: PatternData) => total + current.count,
      0
    );
  } else if (node.children && node.children.length > 0) {
    return node.children.reduce(
      (total: number, child: TreeNode) => total + count_patterns(child),
      0
    );
  }
  return 0;
}

const [useCategoryData, categoryData$] = bind(
  //editorState.pipe(
  //  filter(o => !o),
  //  switchMap(() => combineLatest({ common: commonDictionary$, tagged: taggerResults$}))).pipe(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged: TaggerResults | number | null = data.tagged;
      const common: CommonDictionary | null = data.common;
      if (common && typeof tagged !== "number") {
        // non-number tagged should mean that it is data.
        const cat_pat_map = tagged ? gen_patterns_map(tagged) : new Map();
        const dfsmap = (
          parent: string,
          node: CommonDictionaryTreeNode
        ): TreeNode => ({
          parent: parent,
          id: node.id,
          label: node.label,
          help: node.help,
          children: node.children?.map(dfsmap.bind(null, node.id)) ?? [],
          patterns: cat_pat_map.get(node.id) ?? [],
          checked: CheckboxState.Empty,
        });
        return common.tree.map(dfsmap.bind(null, ""));
      }
      return null;
    })
  )
);

enum CheckboxState {
  Empty,
  Indeterminate,
  Checked,
}

/**
 * Displays the pattern count table.
 */
const Patterns = (props: { data: PatternData[] }) => {
  const key = useId();
  return (
    <div className="table-responsive patterns-container ms-5">
      <table className="table table-sm patterns overflow-auto">
        <thead className="header">
          <tr>
            <th scope="col">Pattern</th>
            <th scope="col" className="text-end">
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {props.data &&
            props.data.map((pat, i) => (
              <tr key={`${key}-row-${i}`}>
                <td>{pat.pattern}</td>
                <td className="text-end pe-3">{pat.count}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

/* Transitions */
const DURATION = 250;
function chevron_rotate(state: string) {
  const rotation = state === "entering" || state === "entered" ? 0.25 : 0;
  return {
    transition: `transform ${DURATION}ms linear`,
    transform: `rotate(${rotation}turn)`,
  };
}
function fade(state: string) {
  const opacity = state === "entering" || state === "entered" ? 1 : 0;
  return { transition: `opacity ${DURATION}ms ease-in-out`, opacity: opacity };
}

/**
 * A node in the CategoryTree
 * @param props
 * @returns
 */
const CategoryNode = (props: {
  data: TreeNode;
  ancestors: string[];
  onChange: (target: TreeNode, state: CheckboxState) => void;
}) => {
  const checkRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const editing = useEditorState();
  const checkId = useId();
  const childrenId = useId();

  useEffect(() => {
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
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const state = e.currentTarget.checked
      ? CheckboxState.Checked
      : CheckboxState.Empty;
    props.onChange(props.data, state);
  };

  const pattern_count = count_patterns(props.data);
  const myCategoryClasses = [...props.ancestors, props.data.id];
  return (
    <li data-docuscope-category={props.data.id} className="list-group-item">
      <div className="d-flex align-items-baseline">
        <button
          type="button"
          className="btn btn-light me-1"
          disabled={!has_child_data(props.data)}
          onClick={() => setExpanded(!expanded)}
          aria-controls={childrenId}
        >
          <Transition in={expanded} timeout={DURATION}>
            {(state) => (
              <i
                className="fa-solid fa-chevron-right category-tree-chevron"
                style={chevron_rotate(state)}
              />
            )}
          </Transition>
        </button>
        <div className="form-check d-inline-flex align-items-baseline align-self-end">
          <input
            ref={checkRef}
            className="form-check-input"
            id={checkId}
            type="checkbox"
            value={props.data.id}
            onChange={change}
            disabled={editing || pattern_count === 0}
          />
          <label className={`form-check-label me-0 ms-1 ${myCategoryClasses.join(' ')}`} htmlFor={checkId}>
            {props.data.label}
          </label>
        </div>
        <OverlayTrigger overlay={<Tooltip>{props.data.help}</Tooltip>}>
          <span className="material-icons comment mx-1 align-self-start">
            comment
          </span>
        </OverlayTrigger>
        <Transition
          in={props.data.patterns.length > 0 || !expanded}
          timeout={DURATION}
        >
          {(state) => (
            <span
              style={fade(state)}
              className={`badge bg-${pattern_count > 0 && !editing ? "primary" : "secondary"
                } rounded-pill fs-6 ms-4`}
            >
              {editing ? "-" : pattern_count}
            </span>
          )}
        </Transition>
      </div>
      <Collapse in={expanded} timeout={DURATION}>
        <div id={childrenId}>
          {props.data.children.length > 0 ? (
            <ul className="list-group">
              {props.data.children.map((sub) => (
                <CategoryNode
                  key={sub.id}
                  data={sub}
                  ancestors={myCategoryClasses}
                  onChange={props.onChange}
                />
              ))}
            </ul>
          ) : (
            ""
          )}
          {props.data.children.length === 0 &&
            props.data.patterns.length > 0 ? (
            <Patterns data={props.data.patterns} />
          ) : (
            ""
          )}
        </div>
      </Collapse>
    </li>
  );
};

/** Find the parent of a given node in the given tree. */
function parent(node: TreeNode, data: TreeNode[]): TreeNode | undefined {
  if (node.parent !== "") {
    const nodes = data.map((c) => [...descendants(c)]).flat();
    return nodes.find((n) => n.id === node.parent);
  }
  return undefined;
}
/*function ancestors(node: TreeNode, data: TreeNode[]): TreeNode[] {
  const ret: TreeNode[] = [];
  let par = parent(node, data);
  while (par) {
    ret.push(par);
    par = parent(par, data);
  }
  return ret;
}
function getCategories(node: TreeNode, data: TreeNode[]): string[] {
  return ['category_node', node.id, ...ancestors(node, data).map((d) => d.id)];
}*/

function findChecked(data: TreeNode[]): string[] {
  const ret: string[] = [];
  data.forEach((d) => {
    if (d.checked === CheckboxState.Indeterminate) {
      ret.push(...findChecked(d.children));
    } else if (d.checked === CheckboxState.Checked) {
      ret.push(d.id)
    }
  })
  return ret;
}
function highlighSelection(data: TreeNode[]): void {
  const categoryColors = d3.scaleOrdinal(d3.schemeCategory10);
  categoryColors.range(d3.schemeCategory10);
  d3.selectAll('.cluster').classed('cluster', false);
  findChecked(data).forEach((id) => d3.selectAll(`.${id}`).classed('cluster', true).style('border-bottom-color', categoryColors(id)));
}

/** Top level node in the CategoryTree */
const CategoryTreeTop = () => {
  const [refresh, setRefresh] = useState(false); // Hack to force refresh.
  const data: TreeNode[] | null = useCategoryData();

  const onChange = (node: TreeNode, state: CheckboxState) => {
    // all children
    [...descendants(node)].forEach((c) => {
      if (count_patterns(c) > 0) {
        c.checked = state;
      }
    });
    // update parents
    let ancestor = parent(node, data ?? []);
    while (ancestor) {
      const desc = [...descendants(ancestor)].slice(1);
      if (
        desc.every(
          (d) => d.checked === CheckboxState.Checked || count_patterns(d) === 0
        )
      ) {
        ancestor.checked = CheckboxState.Checked;
      } else if (desc.every((d) => d.checked === CheckboxState.Empty)) {
        ancestor.checked = CheckboxState.Empty;
      } else {
        ancestor.checked = CheckboxState.Indeterminate;
      }
      ancestor = parent(ancestor, data ?? []);
    }
    // walk data, if node is checked then add category, if empty then skip, else check children
    if (data) {
      console.log(findChecked(data));
      highlighSelection(data);
    }
    setRefresh(!refresh);
  };
  return data ? (
    <React.Fragment>
      <h3 className="mt-2">Dictionary Categories</h3>
      <ul className="impressions-category-tree list-group">
        {data &&
          data.map((cat) => (
            <CategoryNode key={cat.id} data={cat} ancestors={[]} onChange={onChange} />
          ))}
      </ul>
    </React.Fragment>
  ) : (
    <div />
  );
};

const ErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading category information:</p>
    <pre>{props.error?.message}</pre>
  </div>
);

const MySpinner = () => (
  <Spinner animation={"border"} role={"status"} variant={"primary"}>
    <span className="visually-hidden">Loading...</span>
  </Spinner>
);

/** Category Tree for displaying the category hierarchy data. */
const CategoryTree = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<MySpinner />}>
      <Subscribe source$={categoryData$} fallback={<MySpinner />}>
        <CategoryTreeTop />
      </Subscribe>
    </Suspense>
  </ErrorBoundary>
);
export default CategoryTree;
