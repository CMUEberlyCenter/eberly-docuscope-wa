import type { FC } from "react";
import type { RenderElementProps, RenderLeafProps } from "slate-react";

/** Component for rendering editor content nodes. */
const Element: FC<RenderElementProps> = ({ attributes, children, element }) => {
  switch (element.type) {
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>;
    case "heading-four":
      return <h4 {...attributes}>{children}</h4>;
    case "heading-five":
      return <h5 {...attributes}>{children}</h5>;
    case "heading-six":
      return <h6 {...attributes}>{children}</h6>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    default:
      return <p {...attributes}>{children}</p>;
  }
};
export const renderElement = (props: RenderElementProps) => (
  <Element {...props} />
);

/** Component for rendering editor content leaf nodes. */
const Leaf: FC<RenderLeafProps> = ({ children, leaf, attributes }) => (
  <span
    {...attributes}
    style={{
      fontWeight: "bold" in leaf && leaf.bold ? "bold" : "normal",
      textDecoration:
        "underline" in leaf &&
        "strikethrough" in leaf &&
        leaf.underline &&
        leaf.strikethrough
          ? "underline line-through"
          : "underline" in leaf && leaf.underline
            ? "underline"
            : "strikethrough" in leaf && leaf.strikethrough
              ? "line-through"
              : undefined,
      fontStyle: "italic" in leaf && leaf.italic ? "italic" : "initial",
    }}
  >
    {children}
  </span>
);

export const renderLeaf = (props: RenderLeafProps) => <Leaf {...props} />;
