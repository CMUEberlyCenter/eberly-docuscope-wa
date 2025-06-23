import { FC, ReactNode } from "react";
import { OverlayTrigger, Tooltip, Button } from "react-bootstrap";
import { Editor } from "slate";
import { useSlate } from "slate-react";
import type { CustomText } from "../../slate";

type Markings = "bold" | "underline" | "italic" | "strikethrough";
type LeafProps = Omit<CustomText, "text"> & {
  [index in Markings]?: boolean | undefined;
};
const isMarkActive = (editor: Editor, format: Markings) => {
  const marks: LeafProps | null = Editor.marks(editor);
  return marks && format in marks ? marks[format] === true : false;
};

const toggleMark = (editor: Editor, format: Markings) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

export const MarkButton: FC<{
  format: Markings;
  children: ReactNode;
  tooltip: string;
}> = ({ format, children, tooltip }) => {
  const editor = useSlate();

  return (
    <OverlayTrigger placement="bottom" overlay={<Tooltip>{tooltip}</Tooltip>}>
      <Button
        active={isMarkActive(editor, format)}
        onMouseDown={(e) => {
          e.preventDefault();
          toggleMark(editor, format);
        }}
        variant="light"
      >
        {children}
        <span className="visually-hidden sr-only">{tooltip}</span>
      </Button>
    </OverlayTrigger>
  );
};
