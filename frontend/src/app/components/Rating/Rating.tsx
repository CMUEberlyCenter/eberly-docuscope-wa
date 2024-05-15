// Uses Bootstrap css classes
import React from "react";
import "./Rating.scss";

type RatingProps = {
  value: number;
};

/**
 * Render rating stars.
 * @param params
 * @param params.value the raw [0-1] rating value supplied by Scribe. 
 * @returns 
 */
export const Rating: React.FC<RatingProps> = ({ value }: RatingProps) => {
  const scale = 5;
  const rating = value * scale;
  const fullSymbols = Math.floor(rating);

  return (
    <div className="assess-rating" title={`${rating.toFixed(1)}`}>
      <div className={`d-flex rating-${fullSymbols}`}>
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
                style={{ top: 0, left: 0, width: `${percent}%` }}
              ></i>
            </span>
          );
        })}
      </div>
      <span className="visually-hidden ms-2">{rating}</span>
    </div>
  );
};
