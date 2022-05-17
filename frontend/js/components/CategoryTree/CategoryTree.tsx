/**
 * @fileoverview Component for displaying the common dictionary tree and pattern counts.
 *
 * This is part of the visualization (Impressions) of DocuScope tagged data.
 * The tree view sums the number of instances for all subcategories when collapsed.
 * Each node is also selectable, which does affect the seleted states of its
 * ancestors and descendants.
 * Selected nodes should also trigger colored underlining of of itself and its
 * children as well as all instances in the tagged text.
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
  pattern: string; // text string pattern (eg) "I like"
  count: number; // number of instances of that pattern in the text.
}

interface TreeNode {
  parent: string;
  id: string; // machine readable identifier.
  label: string; // human readable identifier.
  help: string; // additional information about category
  children: TreeNode[];
  patterns: PatternData[];
  checked: CheckboxState;
}

/**
 * Predicate to check if a given node has any children.
 * Children defined as child TreeNodes or patterns.
 */
function has_child_data(node: TreeNode): boolean {
  return node.children.length + node.patterns.length > 0;
}
/** Generates all TreeNode descendants of the given node. */
function* descendants(node: TreeNode): Generator<TreeNode> {
  yield node;
  for (const child of node.children) {
    yield* descendants(child);
  }
}
/** Collects the total pattern counts among all descendants. */
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

// Observer that combines common dictionary and tagger results to emit
// the TreeNodes.
const [useCategoryData, categoryData$] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged: TaggerResults | number | null = data.tagged;
      const common: CommonDictionary | null = data.common;
      if (common && typeof tagged !== "number") {
        // non-number `tagged` should mean that it is data.
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

// Tri-state checkbox states.
enum CheckboxState {
  Empty,
  Indeterminate,
  Checked,
}

/**
 * Displays the pattern count table.
 * Two columns: the pattern and a count of instances of that pattern.
 * Each row is a different pattern.
 *
 * TODO: add sorting by pattern or count.
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
const DURATION = 250; // in milliseconds.
// pi/2 rotation for use with expansion chevron.
function chevron_rotate(state: string) {
  const rotation = state === "entering" || state === "entered" ? 0.25 : 0;
  return {
    transition: `transform ${DURATION}ms linear`,
    transform: `rotate(${rotation}turn)`,
  };
}
// Fad in/out effect, used for fading category count.
function fade(state: string) {
  const opacity = state === "entering" || state === "entered" ? 1 : 0;
  return { transition: `opacity ${DURATION}ms ease-in-out`, opacity: opacity };
}

/**
 * A node in the CategoryTree
 * Has a subnode expansion button if required.
 * A checkbox for selecting the category for highlighting.
 * A label displaying the human readable category name.
 * A button to hover over to get a popup further describing the category.
 * The agrigate count of pattern instances for all subcategories
 * shown if this node is not expanded.
 * A collapsable component with child nodes or the patterns table.
 * @param props
 *    data - the current TreeNode,
 *    ancestors - all ancestor ids,
 *    onChange - callback for when checkbox is toggled.
 * @returns a component representing a single node in the tree
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

  // when checked status changes, update checkbox.
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
  }, [props.data.checked]);

  // When editing state changes.
  useEffect(() => {
    // cluster class shows colored underlining to indicate
    // tag highlighting.
    if (editing) {
      // if editing, remove cluster class.
      d3.select(".cluster").classed("cluster", false);
    }
    // cleanup cluster class on destruction.
    return () => {
      d3.select(".cluster").classed("cluster", false);
    };
  }, [editing]);

  // handler of checkbox state change.
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const state = e.currentTarget.checked
      ? CheckboxState.Checked
      : CheckboxState.Empty;
    props.onChange(props.data, state);
  };

  const pattern_count = count_patterns(props.data);
  // To get cluster highlighting to work properly, the ancestor class
  // ids need to be added.
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
            {/* rotate collapse chevron */}
            {(state) => (
              <i
                className="fa-solid fa-chevron-right category-tree-chevron"
                style={chevron_rotate(state)}
              />
            )}
          </Transition>
        </button>
        <div className="form-check d-inline-flex align-items-baseline align-self-end">
          {/* Highlight category checkbox. */}
          <input
            ref={checkRef}
            className="form-check-input"
            id={checkId}
            type="checkbox"
            role="checkbox"
            value={props.data.id}
            onChange={change}
            disabled={editing || pattern_count === 0}
          />
          <label
            className={`form-check-label me-0 ms-1 ${myCategoryClasses.join(
              " "
            )}`}
            htmlFor={checkId}
          >
            {props.data.label}
          </label>
        </div>
        {/* Additional category information tooltip. */}
        <OverlayTrigger overlay={<Tooltip>{props.data.help}</Tooltip>}>
          <span className="material-icons comment mx-1 align-self-start">
            comment
          </span>
        </OverlayTrigger>
        <Transition
          in={props.data.patterns.length > 0 || !expanded}
          timeout={DURATION}
        >
          {/* Animate count fading on expansion. */}
          {(state) => (
            <span
              style={fade(state)}
              className={`badge bg-${pattern_count > 0 && !editing ? "primary" : "secondary"
                } rounded-pill fs-6 ms-4`}
            >
              {/* Indicate invalid count while editing. */}
              {editing ? "-" : pattern_count}
            </span>
          )}
        </Transition>
      </div>
      <Collapse in={expanded} timeout={DURATION}>
        {/* Animate expansion */}
        <div id={childrenId}>
          {/* if there are child nodes, generate those, else show patterns */}
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

// Find the highest checked nodes.
function findChecked(data: TreeNode[]): string[] {
  const ret: string[] = [];
  data.forEach((d) => {
    if (d.checked === CheckboxState.Indeterminate) {
      // indeterminate indicates that some descendants are checked
      ret.push(...findChecked(d.children));
    } else if (d.checked === CheckboxState.Checked) {
      // if current is checked, no need to recurse.
      ret.push(d.id);
    }
  });
  return ret;
}
// Set the colors to be used for category highlighting.
function highlighSelection(data: TreeNode[]): void {
  // reset color indices
  const categoryColors = d3.scaleOrdinal(d3.schemeCategory10);
  categoryColors.range(d3.schemeCategory10);
  // TODO: scope to CategoryTree and tagged text.
  d3.selectAll(".cluster").classed("cluster", false);
  findChecked(data).forEach((id) =>
    d3
      .selectAll(`span.${id}`)
      .classed("cluster", true)
      .style("border-bottom-color", categoryColors(id))
  );
}

/** Top level node in the CategoryTree */
const CategoryTreeTop = () => {
  const [refresh, setRefresh] = useState(false); // Hack to force refresh.
  const data: TreeNode[] | null = useCategoryData();

  // Callback to handle propigating checkbox state through the tree and
  // triggers highlighting.
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
            <CategoryNode
              key={cat.id}
              data={cat}
              ancestors={[]}
              onChange={onChange}
            />
          ))}
      </ul>
    </React.Fragment>
  ) : (
    <div />
  );
};

// What to display if there is an error in this component.
const ErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading category information:</p>
    <pre>{props.error?.message}</pre>
  </div>
);

// Spinner to display on loading.
// Not often seen as there should be some data available by the
// time a user sees this component.
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
