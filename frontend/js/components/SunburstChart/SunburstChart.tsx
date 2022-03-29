import { bind, Subscribe } from "@react-rxjs/core";
import * as d3 from "d3";
import { HierarchyRectangularNode } from "d3";
import * as React from "react";
import { Suspense } from "react";
import { Spinner } from "react-bootstrap";
import { ErrorBoundary } from "react-error-boundary";
import { combineLatest, map } from "rxjs";
import {
  commonDictionary$,
  CommonDictionaryTreeNode
} from "../../service/common-dictionary.service";
import { gen_patterns_map, taggerResults$ } from "../../service/tagger.service";
import "./SunburstChart.scss";

interface Segment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
interface SunburstNode {
  id: string;
  name: string;
  target?: Segment;
  current?: Segment;
  children?: SunburstNode[];
  value?: number;
}
type HierarchyNode = HierarchyRectangularNode<SunburstNode>;

const partition = (
  pdata: SunburstNode
): HierarchyNode => {
  const r = d3.hierarchy(pdata).sum((d) => d.value ?? 0);
  return d3.partition<SunburstNode>().size([2 * Math.PI, r.height + 1])(r);
};
const [useSunbrustData, sunburstData$] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged = data.tagged;
      const common = data.common;
      if (common && tagged) {
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
        root.each((d) => (d.data.current = d as Segment));
        root.each(
          (d) =>
          (d.data.target = {
            x0:
              Math.max(0, Math.min(1, (d.x0 - root.x0) / (root.x1 - root.x0))) *
              2 *
              Math.PI,
            x1:
              Math.max(0, Math.min(1, (d.x1 - root.x0) / (root.x1 - root.x0))) *
              2 *
              Math.PI,
            y0: Math.max(0, d.y0 - root.depth),
            y1: Math.max(0, d.y1 - root.depth),
          })
        );
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
    }
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

interface SunburstChartProps extends React.HTMLProps<HTMLDivElement> {
  width?: number;
}

const SunburstFigure = (props: SunburstChartProps) => {
  const root = useSunbrustData();
  const [parent, setParent] = React.useState(root);
  const wedgeRef = React.useRef(null);
  const labelRef = React.useRef(null);
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

  React.useEffect(() => {
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
    if (p.children) { // gurantee no leaves
      setParent(p);
    }
  };
  const current_path = parent?.ancestors()
    .reverse()
    .slice(1)
    .map((d) => d.data.name)
    .join(" > ");

  return (
    <figure className="sunburst-chart">
      <figcaption>{current_path}</figcaption>
      <svg viewBox={`0 0 ${width} ${width}`}>
        <g transform={`translate(${width / 2},${width / 2})`}>
          <g ref={wedgeRef}>
            {parent?.descendants().filter((d) => arcVisible(relativeArc(d, parent))).map((d) => (
              <path
                key={d.data.id}
                onClick={() => click(d)}
                fill={fill(d)}
                fillOpacity={d.children ? 0.8 : 0.4}
                d={arc(relativeArc(d, parent)) ?? ""}
                className={
                  d.children && d.children.length > 0
                    ? "sunburst-clickable"
                    : ""
                }
              >
                <title>
                  {`${d
                    .ancestors()
                    .map((datum) => datum.data.name)
                    .reverse()
                    .slice(1)
                    .join(" > ")}\n${format(d.value ?? 0)}`}
                </title>
              </path>
            ))}
          </g>
          <g
            ref={labelRef}
            pointerEvents="none"
            textAnchor="middle"
            className="sunburst-chart-label"
          >
            {parent?.descendants().filter((d) => labelVisible(relativeArc(d, parent))).map((d) => (
              <text
                key={`label-${d.data.id}`}
                dy="0.35em"
                transform={labelTransform(relativeArc(d, parent), radius)}
              >
                {d.data.name}
              </text>
            ))}
          </g>
          <circle
            r={radius}
            fill="none"
            pointerEvents="all"
            onClick={() => click(parent?.parent??null)}
          />
        </g>
      </svg>
    </figure>
  );
};

const ErrorFallback = (props: { error?: Error }) => (
  <div role="alert" className="alert alert-danger">
    <p>Error loading chart data:</p>
    <pre>{props.error?.message}</pre>
    {/*<pre>{componentStack}</pre>*/}
    {/*<button onClick={resetErrorBoundary}>Try again</button>*/}
  </div>
);
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
