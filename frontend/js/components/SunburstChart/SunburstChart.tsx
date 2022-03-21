/*import * as React from 'react';
import * as d3 from 'd3';
import { HierarchyRectangularNode } from 'd3';
import './SunburstChart.css';
import { CommonDictionary, useCommonDictionary } from '../../service/common-dictionary.service';

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

const partition = (pdata: SunburstNode) => {
  const r = d3.hierarchy(pdata).sum((d) => d.value ?? 0);
  return d3.partition().size([2 * Math.PI, r.height + 1])(r);
}
const arcVisible = (d: Segment) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
const labelVisible = (d: Segment) =>
  d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
const labelTransform = (d: Segment, radius: number) => {
  const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
  const y = ((d.y0 + d.y1) / 2) * radius;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
};
const color = d3.scaleOrdinal(d3.schemeCategory10);
const format = d3.format(',d');

interface SunburstChartProps extends React.HTMLProps<HTMLDivElement> {
  current_path?: string;
  width?: number;
}

export default (props: SunburstChartProps) => {
  const common: CommonDictionary = useCommonDictionary();
  const width = props.width ?? 300;
  const radius = width / 6;
  const arc = d3.arc<HierarchyRectangularNode<SunburstNode>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));
  const wedgeRef = React.useRef(null);
  const labelRef = React.useRef(null);

  React.useEffect(() => {
    const path = d3.select(wedgeRef.current).selectAll('path').data(//)
      .join('path').attr('fill', (d) => {
        while (d.depth > 1 && d.parent) {
          d = d.parent;
        }
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => arcVisible(d.data.current) ? (d.children ? 0.8 : 0.4) : 0)
      .attr('d', (d) => arc(d.data.current));
    path.filter((d) => d.children ? d.children.length > 0 : false)
      .style('cursor', 'pointer');
    const label = d3.select(labelRef.current).selectAll('text').data(//)
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill-opacity', (d) => +labelVisible(d.data.current))
      .attr('transform', (d) => labelTransform(d.data.current, radius))
      .text((d) => d.data.name);
    path.append('title').text((d) => `${d.ancestors().map((dn) => dn.data.name).reverse().slice(1).join(' > ')}\n${format(d.value ?? 0)}`);
  }, [props]);

  return (
    <figure>
      <figcaption>{props.current_path ?? ''}</figcaption>
      <svg viewBox={`0 0 ${width} ${width}`} className='sunburst-chart'>
        <g transform={`translate(${width / 2},${width / 2})`}>
          <g ref={wedgeRef}></g>
          <g ref={labelRef} pointer-events="none" text-anchor="middle" className='sunburst-chart-label'></g>
          <circle r={radius} fill="none" pointer-events="all" />
        </g>
      </svg>
    </figure>
  )
}
*/
