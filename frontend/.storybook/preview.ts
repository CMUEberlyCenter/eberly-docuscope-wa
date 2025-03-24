import type { Preview } from '@storybook/react';
import '../src/app/i18n';
import '../src/app/index.scss';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;
