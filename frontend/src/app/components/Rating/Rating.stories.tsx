import { Meta, StoryObj } from "@storybook/react";
import { Rating } from "./Rating";

const meta = {
  component: Rating,
  tags: ["autodocs"],
  title: "component/Rating",
  excludeStories: /.*Data$/,
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 0 },
};

export const Value1: Story = {
  args: { value: 1 / 5 },
};

export const Value2: Story = {
  args: { value: 2 / 5 },
};
export const Value3: Story = {
  args: { value: 3 / 5 },
};
export const Value4: Story = {
  args: { value: 4 / 5 },
};
export const Value5: Story = {
  args: { value: 1 },
};
export const ValueHalf: Story = {
  args: { value: 0.5 },
};
