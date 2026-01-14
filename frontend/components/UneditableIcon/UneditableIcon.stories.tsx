import type { Meta, StoryObj } from "@storybook/react-vite";
import { UneditableIcon } from "./UneditableIcon";

const meta = {
  component: UneditableIcon,
  title: "component/UneditableIcon",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof UneditableIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
