import * as d3 from 'd3';
import { HierarchyRectangularNode } from 'd3';
import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import { CommonDictionary, CommonDictionaryTreeNode, useCommonDictionary } from '../../service/common-dictionary.service';
import { gen_patterns_map, TaggerResults, useTaggerResults } from '../../service/tagger.service';
import './SunburstChart.scss';

interface Segment {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}
interface SunburstNode {
  name: string;
  target?: Segment;
  current?: Segment;
  children?: SunburstNode[];
  value?: number;
}

const partition = (pdata: SunburstNode): HierarchyRectangularNode<SunburstNode> => {
  const r = d3.hierarchy(pdata).sum((d) => d.value ?? 0);
  return d3.partition<SunburstNode>().size([2 * Math.PI, r.height + 1])(r);
}
const arcVisible = (d: Segment | undefined) => d && d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
const labelVisible = (d: Segment | undefined) =>
  !!d && d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
const labelTransform = (d: Segment | undefined, radius: number) => {
  const x = d ? (((d.x0 + d.x1) / 2) * 180) / Math.PI : 0;
  const y = d ? ((d.y0 + d.y1) / 2) * radius : 0;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
};
const format = d3.format(',d');
const color = d3.scaleOrdinal(d3.schemeCategory10);

interface SunburstChartProps extends React.HTMLProps<HTMLDivElement> {
  current_path?: string;
  width?: number;
}

const SunburstChart = (props: SunburstChartProps) => {
  const wedgeRef = React.useRef(null);
  const labelRef = React.useRef(null);
  const common: CommonDictionary | null = useCommonDictionary();
  const tagged: TaggerResults | null = useTaggerResults();
  if (common && tagged) {
    const cat_pat_map = gen_patterns_map(tagged);
    const sunmap = (node: CommonDictionaryTreeNode): SunburstNode => ({
      name: node.label,
      children: cat_pat_map.get(node.id)?.map((p) => ({
        name: p.pattern,
        value: p.count,
      })) ?? node.children?.map(sunmap),
    });
    const data = { name: 'root', children: common.tree.map(sunmap) };
    const root: HierarchyRectangularNode<SunburstNode> = partition(data);
    root.each((d) => (d.data.current = d));
    const width = props.width ?? 300;
    const radius = width / 6;
    const arc = d3.arc<Segment>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    //React.useEffect(() => {
    const path = d3.select(wedgeRef.current).selectAll('path').data(root.descendants().slice(1))
      .join('path').attr('fill', (d) => {
        while (d.depth > 1 && d.parent) {
          d = d.parent;
        }
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => arcVisible(d.data.current) ? (d.children ? 0.8 : 0.4) : 0)
      .attr('d', (d) => arc(d.data.current ?? { x0: 0, x1: 0, y0: 0, y1: 0 }));
    path.filter((d) => d.children ? d.children.length > 0 : false)
      .style('cursor', 'pointer');
    /*const label = */d3.select(labelRef.current).selectAll('text').data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill-opacity', (d) => +labelVisible(d.data.current))
      .attr('transform', (d) => labelTransform(d.data.current, radius))
      .text((d) => d.data.name);
    path.append('title').text((d) => `${d.ancestors().map((dn) => dn.data.name).reverse().slice(1).join(' > ')}\n${format(d.value ?? 0)}`);
    //}, [props]);

    return (
      <figure className='sunburst-chart'>
        <figcaption>{props.current_path ?? ''}</figcaption>
        <svg viewBox={`0 0 ${width} ${width}`}>
          <g transform={`translate(${width / 2},${width / 2})`}>
            <g ref={wedgeRef}></g>
            <g ref={labelRef} pointerEvents="none" textAnchor="middle" className='sunburst-chart-label'></g>
            <circle r={radius} fill="none" pointerEvents="all" />
          </g>
        </svg>
      </figure>
    )
  }
  return (<Spinner animation={'border'} />)
}
export default SunburstChart;
