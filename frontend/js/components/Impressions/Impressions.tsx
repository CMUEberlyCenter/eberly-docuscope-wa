import * as React from 'react';
import CategoryTree from '../CategoryTree/CategoryTree';
import SunburstChart from '../SunburstChart/SunburstChart';
import TabTitle from '../TabTitle/TabTitle';

const Impressions = () => (
  <div className="impressions d-flex h-100 w-100 flex-column justify-content-start align-items-stretch">
    <TabTitle title="Manage Readers&apos; Impressions" />
    {/*<div className="impressions-description"></div>*/}
    <div className="impressions-content overflow-auto flex-grow-1">
      <SunburstChart width={300}/>
      <CategoryTree/>
      {/*<iframe className="docuscopeframe" src={docuscope}></iframe>*/}
    </div>
    {/*<div className="impressions-detail"></div>*/}
  </div>
);
export default Impressions;
