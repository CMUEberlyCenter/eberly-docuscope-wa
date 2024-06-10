import { select, selectAll } from "d3";
import { FC, useEffect, useState } from "react";
import { Badge, OverlayTrigger, Popover } from "react-bootstrap";
import { isTaggerResult, useTaggerResults } from "../../service/tagger.service";

/**
 * For handling clicks on the tagged text for the impressions tool.
 * It will reveal the tag for the clicked on pattern while hiding
 * all other tags.
 * @param evt mouse event that triggers this handler
 */
function click_select(evt: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
  let target: HTMLElement | null = evt.target as HTMLElement;
  while (target && !target.getAttribute("data-key")) {
    // check ancestors until one with a data-key is found.
    target = target.parentElement;
  }
  const key = target?.getAttribute("data-key");
  if (target && key && key.trim()) {
    // see if it is already selected.
    const isSelected = select(target).classed("selected_text");
    // clear all selected text.
    selectAll(".selected_text").classed("selected_text", false);
    selectAll(".cluster_id").classed("d_none", true);
    // if it was not previously selected, select it.
    // otherwise leave it as unselected.
    if (!isSelected) {
      select(target).classed("selected_text", true);
      select(target).select("sup.cluster_id").classed("d_none", false);
    }
  }
}

export const ImpressionsTaggedText: FC = () => {
  const tagging = useTaggerResults();

  const [text, setText] = useState('');
  useEffect(() => setText(isTaggerResult(tagging) ? tagging.html_content : ''), [tagging]);

  return (
    <>
      <div className="d-flex align-items-start">
        <h4>Tagged Text:&nbsp;</h4>
        <OverlayTrigger
          placement="right"
          overlay={
            <Popover>
              <Popover.Header as="h3">Notes on Usage</Popover.Header>
              <Popover.Body>
                <p>
                  Please note that this is how DocuScope sees your text and it
                  might appear slightly different than your text, toggle the
                  &quot;Edit Mode&quot; to see your original text.
                </p>
                <p>
                  In the tagged text, you can click on words and phrases to see
                  its category tag. Not all words or phrases have tags.
                  Selecting a category from the Dictionary Categories tree will
                  highlight all of the instances of the selected categories in
                  the tagged text.
                </p>
              </Popover.Body>
            </Popover>
          }
        >
          <Badge bg="info">
            <i className="fa-solid fa-info" />
          </Badge>
        </OverlayTrigger>
      </div>
      <hr />
      <div
        className="tagged-text"
        onClick={(evt) => click_select(evt)}
        dangerouslySetInnerHTML={{ __html: text }}
      ></div>
    </>
  );
};