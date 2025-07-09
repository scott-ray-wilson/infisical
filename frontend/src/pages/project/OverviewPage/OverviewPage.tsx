import { Fragment } from "react";
import { Helmet } from "react-helmet";
import {
  faArrowRightArrowLeft,
  faArrowUpRightFromSquare,
  faBook,
  faClock,
  faCode,
  faCopy,
  faExpand,
  faRotate,
  faSearch,
  faServer,
  faShield,
  faTerminal,
  faUser,
  faUserGroup
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "@tanstack/react-router";

import { createNotification } from "@app/components/notifications";
import { Badge, IconButton, Lottie, PageHeader } from "@app/components/v2";
import { useWorkspace } from "@app/context";
import { useGetProjectOverview } from "@app/hooks/api/dashboard/queries";

const DocLinks = [
  {
    label: "API Docs",
    description: "API endpoints, authentication, and examples",
    icon: faBook,
    link: "https://infisical.com/docs/api-reference/overview/introduction"
  },
  {
    label: "Access Control",
    description: "Manage user permissions and resource-level security",
    icon: faShield,
    link: "https://infisical.com/docs/documentation/platform/access-controls/overview"
  },
  {
    label: "CLI",
    description: "Install, configure, and use command-line tools",
    icon: faTerminal,
    link: "https://infisical.com/docs/cli/overview"
  },
  {
    label: "SDKs",
    description: "Libraries and SDKs for popular programming languages",
    icon: faCode,
    link: "https://infisical.com/docs/sdks/overview"
  },
  {
    label: "Machine Identities",
    description: "Configure service accounts for automated workflows",
    icon: faServer,
    link: "https://infisical.com/docs/documentation/platform/identities/machine-identities#machine-identities"
  },
  {
    label: "Secret Syncs",
    description: "Automatically sync secrets to external platforms",
    icon: faArrowRightArrowLeft,
    link: "https://infisical.com/docs/integrations/secret-syncs/overview"
  },
  {
    label: "Secret Scanning",
    description: "Detect and prevent secret exposure in code",
    icon: faExpand,
    link: "https://infisical.com/docs/documentation/platform/secret-scanning/overview"
  },
  {
    label: "Secret Rotation",
    description: "Automate periodic secret updates and rotation",
    icon: faRotate,
    link: "https://infisical.com/docs/documentation/platform/secret-rotation/overview"
  }
];

const ProductList = [
  {
    label: "Secrets Management",
    icon: "vault",
    key: "secretsManagement" as const,
    items: [
      { label: "Secrets", key: "secretCount" as const },
      { label: "Environments", key: "environmentCount" as const }
    ],
    badge: {
      key: "pendingApprovalCount" as const,
      variant: "primary" as const,
      singularLabel: "Approval",
      pluralLabel: "Approvals",
      icon: faClock
    },
    to: "/projects/$projectId/secret-manager/overview"
  },
  // {
  //   label: "PKI Management",
  //   icon: "note",
  //   items: [
  //     { label: "Subscribers", count: 2 },
  //     { label: "Certificates", count: 4 }
  //     // { label: "CAs", count: 2 }
  //   ],
  //   badge: { variant: "warning", label: "2 Alerts", icon: faWarning },
  //   to: "/projects/$projectId/cert-manager/subscribers" as LinkProps["to"]
  // },
  {
    label: "KMS",
    key: "kms" as const,
    icon: "unlock",
    items: [
      { label: "Keys", key: "keyCount" as const },
      { label: "KMIP Clients", key: "kmipClientCount" as const }
    ],
    to: "/projects/$projectId/kms/overview"
  },
  {
    label: "SSH",
    key: "ssh" as const,
    icon: "terminal",
    items: [
      { label: "Hosts", key: "hostCount" as const },
      { label: "Host Groups", key: "hostGroupCount" as const }
    ],
    to: "/projects/$projectId/ssh/overview"
  },
  {
    label: "Secret Scanning",
    icon: "secret-scan",
    key: "secretScanning" as const,
    items: [
      { label: "Data Sources", key: "dataSourceCount" as const },
      { label: "Resources", key: "resourceCount" as const }
    ],
    badge: {
      variant: "warning" as const,
      key: "findingCount" as const,
      singularLabel: "Finding",
      pluralLabel: "Findings",
      icon: faSearch
    },
    to: "/projects/$projectId/secret-scanning/data-sources"
  }
];

export const OverviewPage = () => {
  const { currentWorkspace } = useWorkspace();

  const { data: overview, isPending } = useGetProjectOverview({
    projectId: currentWorkspace.id,
    projectSlug: currentWorkspace.slug
  });

  // TODO
  if (!overview) return null;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-bunker-800 p-4 pt-8">
      <div className="flex h-full w-full justify-center bg-bunker-800 text-white">
        <Helmet>
          <title>Project Overview | {currentWorkspace.name}</title>
        </Helmet>
        <div className="flex w-full max-w-7xl flex-col justify-evenly">
          <PageHeader
            title={
              <div>
                <span>{currentWorkspace.name}</span>
                <div className="flex w-full flex-wrap items-center gap-2 text-xs font-normal">
                  <div className="flex items-center gap-1 normal-case text-mineshaft-300">
                    <span>Project Slug: {currentWorkspace.slug}</span>
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(currentWorkspace.slug);
                        createNotification({
                          text: "Project slug copied to clipboard",
                          type: "info"
                        });
                      }}
                      variant="plain"
                      size="xs"
                      ariaLabel="Copy project ID"
                    >
                      <FontAwesomeIcon className="text-mineshaft-400" icon={faCopy} />
                    </IconButton>
                  </div>
                  <span className="text-mineshaft-400">|</span>
                  <div className="flex items-center gap-1 normal-case text-mineshaft-300">
                    <span>Project ID: {currentWorkspace.id}</span>
                    <IconButton
                      onClick={() => {
                        navigator.clipboard.writeText(currentWorkspace.id);
                        createNotification({
                          text: "Project ID copied to clipboard",
                          type: "info"
                        });
                      }}
                      variant="plain"
                      size="xs"
                      ariaLabel="Copy project ID"
                    >
                      <FontAwesomeIcon className="text-mineshaft-400" icon={faCopy} />
                    </IconButton>
                  </div>
                </div>
              </div>
            }
          >
            <div className="mb-3 mt-auto flex flex-col gap-4 lg:flex-row lg:items-center">
              {[
                { icon: faUser, count: 4, label: "Members" },
                { icon: faServer, count: 3, label: "Machine Identities" },
                { icon: faUserGroup, count: 1, label: "Group" }
              ].map(({ icon, count, label }, index) => (
                <Fragment key={`${index + 1}-label`}>
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-mineshaft-300">
                    <FontAwesomeIcon icon={icon} />
                    <span>{count}</span>
                    <span>{label}</span>
                  </div>
                  <span className="hidden text-sm text-mineshaft-400 last:hidden lg:block">|</span>
                </Fragment>
              ))}
            </div>
          </PageHeader>
          <div className="w-full border-t border-mineshaft-600" />
          <div className="flex flex-col">
            <div className="mt-16">
              <h3 className="mb-4 text-2xl">Products</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ProductList.map((product) => (
                  <Link
                    to={product.to}
                    key={product.key}
                    className="overflow-clip rounded border border-l-[4px] border-mineshaft-600 border-l-primary/75 bg-mineshaft-800 p-4 transition-transform duration-100 hover:scale-[103%] hover:border-l-primary hover:bg-mineshaft-700"
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="rounded border border-mineshaft-500 bg-mineshaft-600 p-1.5 shadow-inner">
                        <Lottie className="h-[1.75rem] w-[1.75rem] shrink-0" icon={product.icon} />
                      </div>
                      <div className="-mt-0.5 flex w-full flex-col">
                        <div className="flex w-full items-center">
                          <span className="text-xl">{product.label}</span>
                          {product.badge && overview[product.key][product.badge.key] && (
                            <Badge
                              className="ml-auto mt-0.5 flex items-center gap-1.5"
                              variant={product.badge.variant}
                            >
                              <FontAwesomeIcon className="text-yellow" icon={product.badge.icon} />
                              <span>
                                {overview[product.key][product.badge.key]}{" "}
                                {overview[product.key][product.badge.key] > 1
                                  ? product.badge.pluralLabel
                                  : product.badge.singularLabel}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <div className="-mt-0.5 flex items-center gap-2">
                          {product.items.map((item) => (
                            <Fragment key={item.key}>
                              <div className="flex items-center gap-1.5 whitespace-nowrap text-sm text-mineshaft-300">
                                <span>{item.label}</span>
                                <span>{overview[product.key][item.key]}</span>
                              </div>
                              <span className="text-sm text-mineshaft-400 last:hidden">|</span>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-20">
              <h3 className="mb-4 text-xl">Documentation</h3>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {DocLinks.map(({ label, description, icon, link }) => (
                  <a
                    key={label}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-mineshaft-600 bg-mineshaft-800 p-4 transition-transform duration-100 hover:scale-[103%] hover:bg-mineshaft-700"
                  >
                    <div className="w-full items-start">
                      <div className="flex w-full items-center">
                        <FontAwesomeIcon className="mr-2 text-bunker-200" icon={icon} />
                        <span>{label}</span>
                        <FontAwesomeIcon
                          className="ml-auto text-bunker-400"
                          size="sm"
                          icon={faArrowUpRightFromSquare}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-bunker-300">{description}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
