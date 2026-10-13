import { Meta, StoryObj } from "@storybook/react-vite";
import { AccessDeniedReviewTool } from "./AccessDeniedReviewTool";
import { AccessDeniedReason } from "#lib/AccessDeniedReason.ts";

const meta = {
  component: AccessDeniedReviewTool,
  title: "component/AccessDeniedReviewTool",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof AccessDeniedReviewTool>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tool: "expectations",
    reason: AccessDeniedReason.SERVER_DENY,
  },
};

export const WritingTaskDeny: Story = {
  args: {
    tool: "expectations",
    reason: AccessDeniedReason.WRITING_TASK_DENY,
  },
};

export const SnapshotConfigDeny: Story = {
  args: {
    tool: "expectations",
    reason: AccessDeniedReason.SNAPSHOT_CONFIG_DENY,
  },
};
