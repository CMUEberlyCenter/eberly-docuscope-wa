import { Logo } from "./Logo";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  component: Logo,
  title: "component/Logo",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
