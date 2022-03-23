import { bind, Subscribe } from '@react-rxjs/core';
import * as d3 from 'd3';
import { HierarchyRectangularNode } from 'd3';
import * as React from 'react';
import { Suspense } from 'react';
import { Spinner } from 'react-bootstrap';
import { ErrorBoundary } from 'react-error-boundary';
import { combineLatest, map } from 'rxjs';
import { commonDictionary$, CommonDictionaryTreeNode } from '../../service/common-dictionary.service';
import { gen_patterns_map, taggerResults$ } from '../../service/tagger.service';
import './SunburstChart.scss';

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
  current?: HierarchyRectangularNode<SunburstNode>;
  children?: SunburstNode[];
  value?: number;
}

const partition = (pdata: SunburstNode): HierarchyRectangularNode<SunburstNode> => {
  const r = d3.hierarchy(pdata).sum((d) => d.value ?? 0);
  return d3.partition<SunburstNode>().size([2 * Math.PI, r.height + 1])(r);
}
const [useSunbrustData] = bind(
  combineLatest({ common: commonDictionary$, tagged: taggerResults$ }).pipe(
    map((data) => {
      const tagged = data.tagged;
      const common = data.common;
      if (common && tagged) {
        const cat_pat_map = gen_patterns_map(tagged);
        const sunmap = (node: CommonDictionaryTreeNode): SunburstNode => ({
          id: node.id,
          name: node.label,
          children: cat_pat_map.get(node.id)?.map((p) => ({
            id: `pattern-${p.pattern.replace(/\s+/g, '_')}`,
            name: p.pattern,
            value: p.count,
          })) ?? node.children?.map(sunmap),
        });
        const tree = { id: 'root', name: 'root', children: common.tree.map(sunmap) };
        const root = partition(tree);
        root.each((d) => (d.data.current = d));
        return root;
      }
      return null;
    })
  )
);

const arcVisible = (d: Segment | undefined): boolean => Boolean(d && d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0);
const labelVisible = (d: Segment | undefined): number =>
  +(Boolean(!!d && d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03));
const labelTransform = (d: Segment | undefined, radius: number): string => {
  const x = d ? (((d.x0 + d.x1) / 2) * 180) / Math.PI : 0;
  const y = d ? ((d.y0 + d.y1) / 2) * radius : 0;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
};
const format = d3.format(',d');
const color = d3.scaleOrdinal(d3.schemeCategory10);
const fill = (d: d3.HierarchyRectangularNode<SunburstNode>) => {
  while (d.depth > 1 && d.parent) {
    d = d.parent;
  }
  return color(d.data.name);
}

interface SunburstChartProps extends React.HTMLProps<HTMLDivElement> {
  width?: number;
}

const SunburstFigure = (props: SunburstChartProps) => {
  const [current_path, setCurrentPath] = React.useState('');
  const root = useSunbrustData();
  const [parent, setParent] = React.useState(root);
  //const [root, setRoot] = React.useState(base_root);
  const wedgeRef = React.useRef(null);
  const labelRef = React.useRef(null);
  const width = props.width ?? 300;
  const radius = width / 6;
  const arc = d3.arc<HierarchyRectangularNode<SunburstNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  //React.useEffect(() => {
  /*const path = d3.select(wedgeRef.current).selectAll('path').data(root.descendants().slice(1))
    .join('path').attr('fill', (d) => {
      while (d.depth > 1 && d.parent) {
        d = d.parent;
      }
      return color(d.data.name);
    })
    .attr('fill-opacity', (d) => arcVisible(d.data.current) ? (d.children ? 0.8 : 0.4) : 0)
    .attr('d', (d) => arc(d));*/
  /*path.filter((d) => d.children ? d.children.length > 0 : false)
    .style('cursor', 'pointer');*/
  /*const label = d3.select(labelRef.current).selectAll('text').data(root.descendants().slice(1))
    .join('text')
    .attr('dy', '0.35em')
    .attr('fill-opacity', (d) => +labelVisible(d.data.current))
    .attr('transform', (d) => labelTransform(d.data.current, radius))
    .text((d) => d.data.name);*/
  /*path.on('click', (_event: MouseEvent, p: HierarchyRectangularNode<SunburstNode>): void => {
    //setCurrentPath(p ? p.ancestors().reverse().slice(1).map((d) => d.data.name).join(' > ') : '');
    root.each((d) => (d.data.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth),
    }));
    //const trans = d3.transition('sunburst').duration(750);
    path.transition('sunburst').duration(750)
      .tween('data', (d) => {
        const i = d3.interpolate(d.data.current, d.data.target ?? {x0: 0, x1: 0, y0: 0, y1: 0});
        return (t) => (d.data.current = i(t));
      })
      .filter(function (d) {
        return (Boolean(+((this as Element).getAttribute('fill-opacity') ?? 0) || arcVisible(d.data.target)));
      })
      .attr('fill-opacity', (d) => arcVisible(d.data.target) ? (d.children ? 0.8 : 0.4) : 0)
      .attrTween('d', (d) => () => arc(d.data.current)??'');
    label.filter(function (d): boolean {
      return (Boolean(+((this as Element).getAttribute('fill-opacity') ?? 0)) || labelVisible(d.data.target));
    }).transition('sunburst').duration(750).attr('fill-opacity', (d) => +labelVisible(d.data.target))
      .attrTween('transform', (d) => () => labelTransform(d.data.current, radius));
  });*/
  //path.append('title').text((d) => `${d.ancestors().map((dn) => dn.data.name).reverse().slice(1).join(' > ')}\n${format(d.value ?? 0)}`);
  //}, [props]);
  const click = (p: HierarchyRectangularNode<SunburstNode> | null) => {
    if (!p) {
      setCurrentPath('');
      root?.each((d) => (d.data.current = d));
      setParent(root);
      return;
    }
    if (p.children) {
      root?.each((d) => {
        if (d.data.current) { // target
          d.data.current.x0 = Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI;
          d.data.current.x1 = Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI;
          d.data.current.y0 = Math.max(0, d.y0 - p.depth);
          d.data.current.y1 = Math.max(0, d.y1 - p.depth);
        }
      });
      //setRoot(root);
      setCurrentPath(p.ancestors().reverse().slice(1).map((d) => d.data.name).join(' > '));
      setParent(p.parent || root);
    }
  }
  return (
    <figure className='sunburst-chart'>
      <figcaption>{current_path}</figcaption>
      <svg viewBox={`0 0 ${width} ${width}`}>
        <g transform={`translate(${width / 2},${width / 2})`}>
          <g ref={wedgeRef}>
            {root?.descendants().map((d) => (
              <path key={d.data.id} onClick={() => click(d)}
                fill={fill(d)}
                fillOpacity={arcVisible(d.data.current) ? (d.children ? 0.8 : 0.4) : 0}
                d={d.data.current ? (arc(d.data.current) ?? '') : ''}
                className={d.children && d.children.length > 0 ? 'sunburst-clickable' : ''}>
                <title>
                  {`${d.ancestors().map((datum) => datum.data.name).reverse().slice(1).join(' > ')}\n${format(d.value ?? 0)}`}
                </title>
              </path>))}
          </g>
          <g ref={labelRef} pointerEvents="none" textAnchor="middle" className='sunburst-chart-label'>
            {root?.descendants().map((d) => (
              <text key={`label-${d.data.id}`} dy="0.35em" fillOpacity={labelVisible(d.data.current)} transform={labelTransform(d.data.current, radius)}>{d.data.name}</text>
            ))}
          </g>
          <circle r={radius} fill="none" pointerEvents="all" onClick={() => click(parent)} />
        </g>
      </svg>
    </figure>
  )
}
//return (<Spinner animation={'border'} />)
//}

const ErrorFallback = (props: { error?: Error }) => (
  <div role='alert' className='alert alert-danger'>
    <p>Error loading chart data:</p>
    <pre>{props.error?.message}</pre>
    {/*<pre>{componentStack}</pre>*/}
    {/*<button onClick={resetErrorBoundary}>Try again</button>*/}
  </div>
)
const SunburstChart = (props: SunburstChartProps) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <Suspense fallback={<Spinner animation={'border'} />}>
      <Subscribe>
        <SunburstFigure {...props} />
      </Subscribe>
    </Suspense>
  </ErrorBoundary>)
export default SunburstChart;
