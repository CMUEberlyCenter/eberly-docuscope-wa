import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyTaskToClipboardButton } from "./CopyTaskToClipboard";

const meta = {
  component: CopyTaskToClipboardButton,
  title: "component/CopyTaskToClipboardButton",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof CopyTaskToClipboardButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    task: null,
    includeDetails: false,
  },
};
