import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "@tanstack/react-router";
import {
  BanIcon,
  BoxesIcon,
  BoxIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CircleXIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoIcon,
  RadarIcon,
  TriangleAlertIcon
} from "lucide-react";

import { Badge } from "./Badge";

const meta = {
  title: "Generic/Badge",
  component: Badge,
  parameters: {
    layout: "centered"
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "success", "info", "warning", "danger", "project", "org", "sub-org"]
    },
    asChild: {
      table: {
        disable: true
      }
    },
    children: {
      table: {
        disable: true
      }
    }
  },
  args: { children: "Badge" }
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {
  name: "Variant: Neutral",
  args: {
    variant: "neutral",
    children: (
      <>
        <BanIcon />
        Disabled
      </>
    )
  }
};

export const Success: Story = {
  name: "Variant: Success",
  args: {
    variant: "success",
    children: (
      <>
        <CheckIcon />
        Success
      </>
    )
  }
};

export const Info: Story = {
  name: "Variant: Info",
  args: {
    variant: "info",
    children: (
      <>
        <InfoIcon />
        Info
      </>
    )
  }
};

export const Warning: Story = {
  name: "Variant: Warning",
  args: {
    variant: "warning",
    children: (
      <>
        <TriangleAlertIcon />
        Warning
      </>
    )
  }
};

export const Danger: Story = {
  name: "Variant: Danger",
  args: {
    variant: "danger",
    children: (
      <>
        <CircleXIcon />
        Danger
      </>
    )
  }
};

export const Project: Story = {
  name: "Variant: Project",
  args: {
    variant: "project",
    children: (
      <>
        <BoxIcon />
        Project
      </>
    )
  }
};

export const Organization: Story = {
  name: "Variant: Organization",
  args: {
    variant: "org",
    children: (
      <>
        <GlobeIcon />
        Organization
      </>
    )
  }
};

export const SubOrganization: Story = {
  name: "Variant: Sub-Organization",
  args: {
    variant: "sub-org",
    children: (
      <>
        <BoxesIcon />
        Sub-Organization
      </>
    )
  }
};

export const AsExternalLink: Story = {
  name: "Example: As External Link",
  args: {
    variant: "info",
    asChild: true,
    children: (
      <a href="https://infisical.com/">
        Link <ExternalLinkIcon />
      </a>
    )
  }
};

export const AsRouterLink: Story = {
  name: "Example: As Router Link",
  args: {
    variant: "project",
    asChild: true,
    children: (
      <Link to=".">
        <RadarIcon />
        Secret Scanning
      </Link>
    )
  }
};

export const AsButton: Story = {
  name: "Example: As Button",
  args: {
    variant: "org",
    asChild: true,
    children: (
      <button type="button" onClick={() => alert("button clicked")}>
        <GlobeIcon />
        Organization
        <ChevronsUpDownIcon />
      </button>
    )
  }
};

export const IsTruncatable: Story = {
  name: "Example: isTruncatable",
  args: {
    isTruncatable: true,
    children: (
      <>
        <GlobeIcon />
        <span>Infisical Infrastructure</span>
      </>
    )
  },
  decorators: (Story) => (
    <div className="flex w-32">
      <Story />
    </div>
  )
};
