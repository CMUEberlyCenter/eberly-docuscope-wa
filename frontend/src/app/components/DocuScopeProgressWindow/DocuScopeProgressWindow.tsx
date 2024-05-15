/* Progress tracker in a modal like dialog. */
import { FC } from 'react';
import "./DocuScopeProgressWindow.scss";

type DocuScopeProgressProps = {
  title: string;
  progress: number;
};

/**
 * Progress Bar in an overlay window.
 * @param params
 * @param params.title the title of the overlay window.
 * @param params.progress the amoutn of progress [0-100]
 */
const DocuScopeProgressWindow: FC<DocuScopeProgressProps> = ({
  title,
  progress,
}: DocuScopeProgressProps) => (
  <div className="progresswindow">
    <div className="progresstitle">{title}</div>
    <div className="progress m-3 rounded-pill">
      <div
        className="progress-bar progress-bar-striped progress-bar-animated"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
);

export default DocuScopeProgressWindow;
