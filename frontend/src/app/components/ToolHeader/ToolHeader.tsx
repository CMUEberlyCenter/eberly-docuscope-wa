import { FC } from "react";
import { Translation } from "react-i18next";
import { FadeContent } from "../FadeContent/FadeContent";

type Props = {
  title: string;
  instructionsKey: string;
}
export const ToolHeader: FC<Props> = ({ title, instructionsKey }) => (
  <header>
    <h4 className="text-primary fw-bold">{title}</h4>
    <Translation ns="instructions">
      {(t) => <FadeContent htmlContent={t(instructionsKey)} />}
    </Translation>
  </header>
)
