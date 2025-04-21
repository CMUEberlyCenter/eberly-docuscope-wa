import { AlertIcon } from "./AlertIcon";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  component: AlertIcon,
  title: "component/AlertIcon",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof AlertIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "Alert message",
    show: true,
  },
};
