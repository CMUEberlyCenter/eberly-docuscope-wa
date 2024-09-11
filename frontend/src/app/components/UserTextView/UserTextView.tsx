import escapeHtml from "escape-html";
import { FC, useContext, useEffect, useState } from "react";
import { Card, CardProps, Placeholder } from "react-bootstrap";
import NoEditIcon from "../../assets/icons/no_edit_icon.svg?react";
import { useReview } from "../../service/review.service";
import { ReviewContext } from "../Review/ReviewContext";
import { WritingTaskTitle } from "../WritingTaskTitle/WritingTaskTitle";
import "./UserTextView.scss";

type UserTextViewProps = CardProps & {
  prose: string;
};
export const UserTextView: FC<UserTextViewProps> = ({ prose, ...props }) => {
  const review = useReview();
  const [content, setContent] = useState(prose);
  const ctx = useContext(ReviewContext);
  useEffect(() => {
    if (!ctx?.sentences || ctx.sentences.length <= 0) {
      setContent(prose);
    } else {
      const highlights = ctx.sentences
        .map(escapeHtml)
        .reduce(
          (prev, sentence) =>
            prev.replaceAll(
              sentence,
              `<span class="highlight">${sentence}</span>`
            ),
          prose
        );
      setContent(highlights);
    }
  }, [prose, ctx]);

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
            className="p-2 flex-grow-1 user-text"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </Card.Body>
    </Card>
  );
};
