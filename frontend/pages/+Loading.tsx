import { FC } from "react";
import DotSpinner from "../src/app/assets/icons/6-dots-rotate.svg?react";
import style from "../src/app/components/Loading/Loading.module.scss";

const LoadingLayout: FC = () => (
  <div role="status" className="vw-100 vh-100 position-relative">
    <div className="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center">
      <DotSpinner
        aria-hidden="true"
        className={`text-primary ${style["loading-animate-spin"]}`}
      />
    </div>
  </div>
);

export default { layout: LoadingLayout };
