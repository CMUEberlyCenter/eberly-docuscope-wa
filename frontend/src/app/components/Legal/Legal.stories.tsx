import { Legal } from "./Legal";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  component: Legal,
  title: "component/Legal",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof Legal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
