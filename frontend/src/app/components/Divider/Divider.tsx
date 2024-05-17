/**
 * @fileoverview A simple vertical divider component with with grip icons.
 *
 * This component is just to visually represent a vertical divider that
 * can be dragged to resize elements in a flex container.  It is the
 * responsability of the parent component to add the appropriate event
 * handlers to this component.  Please add handlers for the following which
 * deal with initiating dragging:
 *  - onMouseDown
 *  - onTouchEnd
 *  - onTouchStart
 * The parent component should also register handlers for these events to
 * deal with moving and resizing elements:
 *  - mouseup
 *  - mousemove
 *  - touchmove
 */
import { FC, HTMLProps } from "react";
import "./Divider.scss";

/**
 *
 * @param props any valid properties on a div element.
 * @returns
 */
const Divider: FC<HTMLProps<HTMLDivElement>> = (
  props: HTMLProps<HTMLDivElement>
) => (
  <div
    className="divider d-flex flex-column justify-content-center bg-light border mx-1"
    {...props}
    aria-label="resize"
  >
    <i className="fa-solid fa-grip-vertical opacity-50"></i>
    <i className="fa-solid fa-grip-vertical opacity-50"></i>
    <i className="fa-solid fa-grip-vertical opacity-50"></i>
  </div>
);
export default Divider;
