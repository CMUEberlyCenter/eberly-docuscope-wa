// Uses Bootstrap css classes
import classNames from "classnames";
import type { FC, HTMLProps } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import style from "./Rating.module.scss";

type RatingProps = HTMLProps<HTMLDivElement> & {
  value: number;
  scale?: number; // Optional scale, default is 5, minimum is 1, maximum is 5
};

/**
 * Render rating stars.
 * @param params
 * @param params.value the raw [0-1] rating value.
 * @param params.scale the scale of the rating, default is 5, minimum is 1, maximum is 5.
 * @returns
 */
export const Rating: FC<RatingProps> = ({
  scale,
  value,
  className,
  ...props
}) => {
  const maxValue = 5; // Only have 5 colors specified in the CSS
  scale = Math.min(Math.max(1, Math.floor(scale || 5)), maxValue); // Default scale to 5 if not provided
  const rating = value * scale;
  const fullSymbols = Math.floor(rating);

  return (
    <OverlayTrigger
      placement="right"
      overlay={<Tooltip>{rating.toFixed(1)}</Tooltip>}
    >
      <div
        {...props}
        className={classNames(className, style["assess-rating"])}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={scale}
        aria-valuenow={rating}
      >
        <div
          className={classNames(
            `d-flex align-items-baseline`,
            style[`rating-${fullSymbols}`]
          )}
        >
          {new Array(scale).fill(0).map((_v, i) => {
            let percent = 0;
            if (i - fullSymbols < 0) {
              percent = 100;
            } else if (i - fullSymbols === 0) {
              percent = (rating - i) * 100;
            } else {
              percent = 0;
            }
            return (
              <span key={`rating-${i}`} className="position-relative">
                <i
                  className={`fa-regular fa-star ${percent < 100 ? "visible" : "invisible"}`}
                ></i>
                <i
                  className="fa-solid fa-star d-inline-block position-absolute overflow-hidden"
                  style={{ top: 5, left: 0, width: `${percent}%` }}
                ></i>
              </span>
            );
          })}
        </div>
        <span className="visually-hidden ms-2">{rating}</span>
      </div>
    </OverlayTrigger>
  );
};
