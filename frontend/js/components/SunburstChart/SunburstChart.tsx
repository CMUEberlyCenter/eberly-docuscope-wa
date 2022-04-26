/* Sunburst chart for visualizing DocuScope tagger data */
import { bind, Subscribe } from "@react-rxjs/core";
import * as d3 from "d3";
import { HierarchyRectangularNode } from "d3";
import React, {
  HTMLProps,
  Suspense,
  SVGProps,
  useEffect,
  useRef,
  useState,
} from "react";
import { Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { combineLatest, map } from "rxjs";
import {
  commonDictionary$,
  CommonDictionaryTreeNode,
} from "../../service/common-dictionary.service";
import { useEditorState } from "../../service/editor-state.service";
import { gen_patterns_map, taggerResults$ } from "../../service/tagger.service";
import "./SunburstChart.scss";

interface Segment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
function equalSegment(a: Segment, b: Segment) {
  return a.x0 === b.x0 && a.x1 === b.x1 && a.y0 === b.y0 && a.y1 === b.y1;
}
interface SunburstNode {
  id: string;
  name: string;
  children?: SunburstNode[];
  value?: number;
}
type HierarchyNode = HierarchyRectangularNode<SunburstNode>;

const partition = (pdata: SunburstNode): HierarchyNode => {
  const r = d3.hierarchy(pdata).sum((d) => d.value ?? 0);
  return d3.partition<SunburstNode>().size([2 * Math.PI, r.height + 1])(r);
};
const [useSunbrustData, sunburstData$] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged = data.tagged;
      const common = data.common;
      if (common && tagged && typeof tagged !== "number") {
        const cat_pat_map = gen_patterns_map(tagged);
        const sunmap = (node: CommonDictionaryTreeNode): SunburstNode => ({
          id: node.id,
          name: node.label,
          children:
            cat_pat_map.get(node.id)?.map((p) => ({
              id: `pattern-${p.pattern.replace(/\s+/g, "_")}`,
              name: p.pattern,
              value: p.count,
            })) ?? node.children?.map(sunmap),
        });
        const tree = {
          id: "root",
          name: "root",
          children: common.tree.map(sunmap),
        };
        const root = partition(tree);
        return root;
      }
      return null;
    })
  )
);

function relativeArc(d: HierarchyNode, p: HierarchyNode | null): Segment {
  if (p) {
    const p2 = 2 * Math.PI;
    return {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * p2,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * p2,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth),
    };
  }
  return d as Segment;
}
const arcVisible = (d: Segment | undefined): boolean =>
  Boolean(d && d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0);
const labelVisible = (d: Segment | undefined): number =>
  +Boolean(
    !!d && d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03
  );
const labelTransform = (d: Segment | undefined, radius: number): string => {
  const x = d ? (((d.x0 + d.x1) / 2) * 180) / Math.PI : 0;
  const y = d ? ((d.y0 + d.y1) / 2) * radius : 0;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
};
const format = d3.format(",d");
const color = d3.scaleOrdinal(d3.schemeCategory10);
const fill = (d: HierarchyNode) => {
  while (d.depth > 1 && d.parent) {
    d = d.parent;
  }
  return color(d.data.name);
};
const opacity = (visible: boolean, hasChildren: boolean) =>
  visible ? (hasChildren ? 0.8 : 0.4) : 0;

interface ArcProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arc: d3.Arc<any, Segment>;
  root: HierarchyNode | null;
  node: HierarchyNode;
  onClick: (d: HierarchyNode) => void;
}
const Arc = (props: ArcProps) => {
  const { arc, root, node, onClick } = props;
  const ref = useRef(null);
  const [current, setCurrent] = useState(relativeArc(node, root));
  useEffect(() => {
    const target = relativeArc(node, root);
    if (!equalSegment(current, target)) {
      const current_visible = arcVisible(current);
      const target_visible = arcVisible(target);
      if (ref.current && (current_visible || target_visible)) {
        //const visInterp = d3.interpolate(opacity(current_visible, !!node.children), opacity(target_visible, !!node.children));
        d3.select(ref.current)
          .transition("sunburst")
          .duration(750)
          .attr("fill-opacity", () =>
            opacity(arcVisible(target), !!node.children)
          )
          .attrTween("d", () => {
            const interp = d3.interpolate(current, target);
            return (t: number) => arc(interp(t)) ?? "";
          })
          .on("end", () => setCurrent(target));
      } else {
        setCurrent(target);
      }
    }
  }, [node, root, arc, current]);

  return (
    <path
      ref={ref}
      onClick={() => onClick(node)}
      d={arc(current) ?? ""}
      fill={fill(node)}
      fillOpacity={opacity(arcVisible(current), !!node.children)}
      className={
        node.children && node.children.length > 0 ? "sunburst-clickable" : ""
      }
    >
      <title>
        {`${props.node
          .ancestors()
          .map((datum) => datum.data.name)
          .reverse()
          .slice(1)
          .join(" > ")}\n${format(props.node.value ?? 0)}`}
      </title>
    </path>
  );
};
interface ArcLabelProps extends SVGProps<SVGTextElement> {
  root: HierarchyNode | null;
  node: HierarchyNode;
  radius: number;
}
const ArcLabel = (props: ArcLabelProps) => {
  const { root, node, radius } = props;
  const [current, setCurrent] = useState(relativeArc(node, root));
  const ref = useRef(null);

  useEffect(() => {
    const target = relativeArc(node, root);
    if (!equalSegment(current, target)) {
      const current_visible = arcVisible(current);
      const target_visible = arcVisible(target);
      if (ref.current && (current_visible || target_visible)) {
        d3.select(ref.current)
          .transition("sunburst")
          .duration(750)
          .attr("fill-opacity", () =>
            target_visible ? labelVisible(target) : 0
          )
          .attrTween("transform", () => {
            const interp = d3.interpolate(current, target);
            return (t: number) => labelTransform(interp(t), radius);
          })
          .on("end", () => setCurrent(target));
      } else {
        setCurrent(target);
      }
    }
  }, [node, root, current, radius]);

  return (
    <text
      {...props}
      ref={ref}
      dy="0.35em"
      opacity={arcVisible(current) ? labelVisible(current) : 0}
      transform={labelTransform(current, radius)}
    >
      {node.data.name}
    </text>
  );
};

interface SunburstChartProps extends HTMLProps<HTMLDivElement> {
  width?: number;
}

const SunburstFigure = (props: SunburstChartProps) => {
  const root = useSunbrustData();
  const editing = useEditorState();
  const [parent, setParent] = useState(root);
  const wedgeRef = useRef(null);
  const labelRef = useRef(null);
  const width = props.width ?? 300;
  const radius = width / 6;
  const arc = d3
    .arc<Segment>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  useEffect(() => {
    sunburstData$.subscribe((data) => {
      if (data !== root) {
        setParent(data);
      }
    });
  });
  const click = (p: HierarchyNode | null) => {
    if (!p) {
      setParent(root);
      return;
    }
    if (p.children) {
      // gurantee no leaves
      setParent(p);
    }
  };
  const current_path = parent
    ?.ancestors()
    .reverse()
    .slice(1)
    .map((d) => d.data.name)
    .join(" > ");

  return (
    <figure
      {...props}
      className={`sunburst-chart ${
        editing || parent === null ? "placeholder w-100" : ""
      }`}
      aria-hidden={editing}
    >
      <svg viewBox={`0 0 ${width} ${width}`}>
        <g transform={`translate(${width / 2},${width / 2})`}>
          <g ref={wedgeRef}>
            {root?.descendants().map((d) => (
              <Arc
                key={d.data.id}
                node={d}
                root={parent}
                onClick={click}
                arc={arc}
              />
            ))}
          </g>
          <g
            ref={labelRef}
            pointerEvents="none"
            textAnchor="middle"
            className="sunburst-chart-label"
          >
            {root?.descendants().map((d) => (
              <ArcLabel
                key={`label-${d.data.id}`}
                radius={radius}
                node={d}
                root={parent}
              />
            ))}
          </g>
          <circle
            r={radius}
            fill="none"
            pointerEvents="all"
            onClick={() => click(parent?.parent ?? null)}
          />
        </g>
      </svg>
      <figcaption>&nbsp;{current_path}</figcaption>
    </figure>
  );
};

/** Custom error feedback. */
const ErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading chart data:</p>
    <pre>{props.error?.message}</pre>
    {/*<pre>{componentStack}</pre>*/}
    {/*<button onClick={resetErrorBoundary}>Try again</button>*/}
  </div>
);
/**
 * Sunburst Chart for visualizing proportions in hierarchical data.
 * @param props
 * @returns
 */
const SunburstChart = (props: SunburstChartProps) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<Spinner animation={"border"} />}>
      <Subscribe>
        <SunburstFigure {...props} />
      </Subscribe>
    </Suspense>
  </ErrorBoundary>
);
export default SunburstChart;
