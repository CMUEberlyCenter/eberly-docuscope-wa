import { FadeContent } from "./FadeContent";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  component: FadeContent,
  title: "component/FadeContent",
  tags: ["autodocs"],
  excludeStories: /.*Data$/,
} satisfies Meta<typeof FadeContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    htmlContent: `<p>
    Lorem ipsum Donec molestie tincidunt dolor, id rutrum sapien
    tincidunt eget. Ut scelerisque at sapien quis ornare. Mauris
    a nisi non eros scelerisque vehicula sit amet quis ante. Sed
    pulvinar consequat ipsum sit amet fermentum. Donec facilisis
    nec purus nec vulputate. Sed ornare lacinia sodales. Praesent
    lacus lorem, fermentum suscipit sem et, pretium tempor leo.
    Mauris finibus lorem arcu, nec vehicula ante convallis quis.
    Aenean risus eros, cursus sit amet maximus sit amet, ornare
    vitae felis. Aliquam et consectetur ex. Quisque maximus,
    felis pulvinar posuere hendrerit, eros dolor accumsan justo,
    eget convallis leo elit sed diam. Aenean non neque tempus
    turpis consequat suscipit. Nullam ultrices nunc quis gravida
    vehicula. Cras non libero placerat, laoreet nisi at, varius
    magna.
  </p><p>
    Phasellus non posuere ipsum. Fusce pretium magna ex, vitae
    efficitur nunc egestas vitae. Vivamus quis elit a ex tincidunt
    iaculis. Cras facilisis justo vehicula auctor blandit. Nullam
    fermentum sollicitudin ante in ornare. Mauris pellentesque
    eros eu ante convallis pulvinar. Praesent pharetra porttitor
    tempus. Fusce porttitor consequat nisi vel sagittis. Cras eu
    posuere nibh. Integer ac eros vestibulum, euismod tortor at,
    hendrerit nunc. Vivamus porttitor, nibh id placerat pharetra,
    sem ligula iaculis massa, elementum tempus orci erat sed massa.
    Cras et metus ac ex finibus viverra. Aenean efficitur turpis
    neque, a tristique sapien ornare non. Maecenas sed rutrum
    turpis.
  </p>`,
  },
};
