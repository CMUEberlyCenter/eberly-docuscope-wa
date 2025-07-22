/* @overview: This is the review tools page. The user reviews a structured writing task with feedback from LLM's. */
import { type FC } from "react";
import { Review } from "../../../src/app/components/Review/Review";

// tab event keys
// type TabKey = "big_picture" | "fine_tuning";

const Page: FC = () => {
  // const { t } = useTranslation();
  // const [tab, setTab] = useState<TabKey>("big_picture");

  // const bigPictureFeature = useBigPictureEnabled();
  // const fineTuningFeature = useFineTuningEnabled();

  return (
    <Review />
    // <Split
    //   className="container-fluid vh-100 w-100 d-flex flex-row review align-items-stretch"
    //   sizes={[60, 40]}
    //   minSize={[400, 320]}
    //   expandToMin={true}
    // >
    //   <UserTextView className="my-1" />
    //   <aside className="my-1 border rounded bg-light d-flex flex-column">
    //     <StageHeader title={t("tool.tab.review")} />
    //     <Tabs activeKey={tab} onSelect={(key) => setTab(key as TabKey)}
    //       variant="underline" className="h-100 justify-content-around inverse-color">
    //       {bigPictureFeature && (
    //         <Tab eventKey="big_picture" title={t("review:tabs.big_picture")}>

    //         </Tab>
    //       )}
    //       {fineTuningFeature && (
    //         <Tab eventKey="fine_tuning" title={t("review:tabs.fine_tuning")}>
    //         </Tab>
    //       )}
    //     </Tabs>
    //     <Legal />
    //   </aside>
    //   {/* <Review /> */}
    // </Split>
  );
};
export default Page;
