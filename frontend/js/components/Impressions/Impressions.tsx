import * as React from 'react';
import CategoryTree from '../CategoryTree/CategoryTree';
import TabTitle from '../TabTitle/TabTitle';

export default () => (
  <div className="impressions d-flex h-100 w-100 flex-column justify-content-start align-items-stretch">
    <TabTitle title="Manage Readers' Impressions" />
    {/*<div className="impressions-description"></div>*/}
    <div className="impressions-content overflow-auto flex-grow-1">
      <CategoryTree/>
      {/*<iframe className="docuscopeframe" src={docuscope}></iframe>*/}
    </div>
    {/*<div className="impressions-detail"></div>*/}
  </div>
);
