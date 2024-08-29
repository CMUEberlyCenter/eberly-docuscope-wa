import { FC, useEffect, useState } from "react";
import { Card, CardProps, Placeholder } from "react-bootstrap";
import { useReview } from "../../service/review.service";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";
import "./UserTextView.scss";

type UserTextViewProps = CardProps & {
  prose: string;
  sentences?: string[] | null;
};
export const UserTextView: FC<UserTextViewProps> = ({
  prose,
  sentences,
  ...props
}) => {
  const review = useReview();
  const [content, setContent] = useState(prose);
  useEffect(() => {
    if (!sentences || sentences.length <= 0) {
      setContent(prose);
    } else {
      const highlights = sentences.reduce(
        (prev, sentence) =>
          prev.replaceAll(
            sentence,
            `<span class="highlight">${sentence}</span>`
          ),
        prose
      );
      setContent(highlights);
    }
  }, [prose, sentences]);

  return (
    <Card as={"main"} {...props}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <WritingTaskTitle />
        <NoEditIcon />
      </Card.Header>
      <Card.Body as="article" className="overflow-auto">
        {typeof review !== "object" ? (
          <Placeholder></Placeholder>
        ) : (
          <div
            className="p-2 flex-grow-1"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </Card.Body>
    </Card>
  );
};
