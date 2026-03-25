import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bell,
  Blocks,
  BookCheck,
  Cable,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cog,
  Container,
  CreditCard,
  Database,
  DoorOpen,
  FileKey,
  FileText,
  FolderCog,
  HardDrive,
  IdCardLanyard,
  Key,
  KeyRound,
  LayoutDashboard,
  Lock,
  Monitor,
  Network,
  Plug,
  RefreshCw,
  Route,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  ShieldUser,
  Terminal,
  User,
  Users,
  Video
} from "lucide-react";
import { twMerge } from "tailwind-merge";

import { ProjectPermissionCan } from "@app/components/permissions";
import {
  Badge,
  OrgIcon,
  ProjectIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SubOrgIcon
} from "@app/components/v3";
import {
  ProjectPermissionActions,
  ProjectPermissionSub,
  useOrganization,
  useProject,
  useProjectPermission,
  useSubscription
} from "@app/context";
import { ProjectPermissionSecretScanningFindingActions } from "@app/context/ProjectPermissionContext/types";
import {
  useGetAccessRequestsCount,
  useGetSecretApprovalRequestCount,
  useGetSecretRotations,
  useListWorkspaceCertificateTemplates,
  useListWorkspacePkiSubscribers
} from "@app/hooks/api";
import { ProjectType } from "@app/hooks/api/projects/types";
import { useGetSecretScanningUnresolvedFindingCount } from "@app/hooks/api/secretScanningV2";

// --- Constants ---

const PROJECT_TYPE_PATH: Record<ProjectType, string> = {
  [ProjectType.SecretManager]: "secret-management",
  [ProjectType.CertificateManager]: "cert-manager",
  [ProjectType.SSH]: "ssh",
  [ProjectType.KMS]: "kms",
  [ProjectType.PAM]: "pam",
  [ProjectType.SecretScanning]: "secret-scanning",
  [ProjectType.AI]: "ai"
};

// --- Submenu types ---

type SubmenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
};

type Submenu = {
  title: string;
  items: SubmenuItem[];
  pathSuffix: string;
  defaultTab: string;
};

// --- Nav item types ---

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathSuffix: string;
  activeMatch?: RegExp;
  badgeCount?: number;
  hidden?: boolean;
  submenu?: Submenu;
  /** For SSH CA permission gating */
  permissionCheck?: boolean;
};

type OrgNavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  isActive: boolean;
  submenu?: Submenu;
};

// --- Shared submenu definitions ---

const ORG_ACCESS_CONTROL_SUBMENU: Submenu = {
  title: "Access Control",
  pathSuffix: "access-management",
  defaultTab: "members",
  items: [
    { label: "Members", icon: User, tab: "members" },
    { label: "Groups", icon: Users, tab: "groups" },
    { label: "Machine Identities", icon: HardDrive, tab: "identities" },
    { label: "Roles", icon: IdCardLanyard, tab: "roles" }
  ]
};

const PROJECT_ACCESS_CONTROL_SUBMENU: Submenu = {
  title: "Access Control",
  pathSuffix: "access-management",
  defaultTab: "members",
  items: [
    { label: "Users", icon: User, tab: "members" },
    { label: "Groups", icon: Users, tab: "groups" },
    { label: "Machine Identities", icon: HardDrive, tab: "identities" },
    { label: "Roles", icon: IdCardLanyard, tab: "roles" }
  ]
};

const SECRET_MANAGER_ACCESS_CONTROL_SUBMENU: Submenu = {
  ...PROJECT_ACCESS_CONTROL_SUBMENU,
  items: [
    ...PROJECT_ACCESS_CONTROL_SUBMENU.items,
    { label: "Service Tokens", icon: Key, tab: "service-tokens" }
  ]
};

const SM_SETTINGS_SUBMENU: Submenu = {
  title: "Settings",
  pathSuffix: "settings",
  defaultTab: "tab-project-general",
  items: [
    { label: "General", icon: Cog, tab: "tab-project-general" },
    { label: "Secrets Management", icon: FileKey, tab: "tab-secret-general" },
    { label: "Encryption", icon: Lock, tab: "tab-project-encryption" },
    { label: "Workflow Integrations", icon: Plug, tab: "tab-workflow-integrations" },
    { label: "Webhooks", icon: Cable, tab: "tab-project-webhooks" }
  ]
};

const INTEGRATIONS_SUBMENU: Submenu = {
  title: "Integrations",
  pathSuffix: "integrations",
  defaultTab: "app-connections",
  items: [
    { label: "App Connections", icon: Cable, tab: "app-connections" },
    { label: "Secret Syncs", icon: ArrowLeftRight, tab: "secret-syncs" },
    { label: "Framework Integrations", icon: Blocks, tab: "framework-integrations" },
    { label: "Infrastructure Integrations", icon: Container, tab: "infrastructure-integrations" },
    { label: "Native Integrations", icon: Plug, tab: "native-integrations" }
  ]
};

const getOrgSettingsSubmenu = ({
  isSubOrganization,
  hasSubOrganization
}: {
  isSubOrganization: boolean;
  hasSubOrganization: boolean;
}): Submenu => ({
  title: "Settings",
  pathSuffix: "settings",
  defaultTab: "tab-org-general",
  items: [
    { label: "General", icon: Cog, tab: "tab-org-general" },
    ...(!isSubOrganization
      ? [
          { label: "SSO", icon: ShieldUser, tab: "sso-settings" },
          { label: "Provisioning", icon: Route, tab: "provisioning-settings" },
          { label: "Security", icon: ShieldCheck, tab: "tab-org-security" }
        ]
      : []),
    { label: "Encryption", icon: Lock, tab: "tab-org-encryption" },
    { label: "Workflow Integrations", icon: Plug, tab: "workflow-integrations" },
    { label: "Audit Log Streams", icon: FileText, tab: "tag-audit-log-streams" },
    { label: "External Migrations", icon: Database, tab: "tab-external-migrations" },
    { label: "Project Templates", icon: FolderCog, tab: "project-templates" },
    { label: "Product Enforcements", icon: ClipboardList, tab: "product-enforcements" },
    ...(!isSubOrganization && hasSubOrganization
      ? [{ label: "Sub Organizations", icon: SubOrgIcon, tab: "tab-sub-organizations" }]
      : [])
  ]
});

const getSecretSharingSubmenu = ({
  isSubOrganization
}: {
  isSubOrganization: boolean;
}): Submenu => ({
  title: "Secret Sharing",
  pathSuffix: "secret-sharing",
  defaultTab: "share-secret",
  items: [
    { label: "Share Secrets", icon: ArrowUpFromLine, tab: "share-secret" },
    { label: "Request Secrets", icon: ArrowDownToLine, tab: "request-secret" },
    ...(!isSubOrganization ? [{ label: "Settings", icon: Settings, tab: "settings" }] : [])
  ]
});

const NETWORKING_SUBMENU: Submenu = {
  title: "Networking",
  pathSuffix: "networking",
  defaultTab: "gateways",
  items: [
    { label: "Gateways", icon: DoorOpen, tab: "gateways" },
    { label: "Relays", icon: Route, tab: "relays" }
  ]
};

// --- Generic submenu view for projects ---

const ProjectSubmenuView = ({ submenu, onBack }: { submenu: Submenu; onBack: () => void }) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { pathname } = useLocation();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;

  const typePath = PROJECT_TYPE_PATH[currentProject.type];
  const basePath = `/organizations/${currentOrg.id}/projects/${typePath}/${currentProject.id}`;
  const isOnPage = pathname.startsWith(`${basePath}/${submenu.pathSuffix}`);
  const currentTab = searchParams?.selectedTab;

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          className="cursor-pointer hover:bg-foreground/[0.025]"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft />
          <span>{submenu.title}</span>
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {submenu.items.map((sub) => {
          const isActive =
            isOnPage && (currentTab === sub.tab || (!currentTab && sub.tab === submenu.defaultTab));

          return (
            <SidebarMenuItem key={sub.label}>
              <SidebarMenuButton
                size="lg"
                scope="project"
                asChild
                isActive={isActive}
                tooltip={sub.label}
              >
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={
                    `/organizations/$orgId/projects/${typePath}/$projectId/${submenu.pathSuffix}` as any
                  }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ orgId: currentOrg.id, projectId: currentProject.id } as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  search={{ selectedTab: sub.tab } as any}
                >
                  <sub.icon className="size-4" />
                  <span>{sub.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// --- Generic submenu view for org ---

const OrgSubmenuView = ({ submenu, onBack }: { submenu: Submenu; onBack: () => void }) => {
  const { currentOrg } = useOrganization();
  const { pathname } = useLocation();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const orgId = currentOrg.id;

  const isOnPage = pathname.startsWith(`/organizations/${orgId}/${submenu.pathSuffix}`);
  const currentTab = searchParams?.selectedTab;

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          className="cursor-pointer hover:bg-foreground/[0.025]"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft />
          <span>{submenu.title}</span>
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {submenu.items.map((sub) => {
          const isActive =
            isOnPage && (currentTab === sub.tab || (!currentTab && sub.tab === submenu.defaultTab));

          return (
            <SidebarMenuItem key={sub.label}>
              <SidebarMenuButton size="lg" asChild isActive={isActive} tooltip={sub.label}>
                <Link
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={`/organizations/$orgId/${submenu.pathSuffix}` as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ orgId } as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  search={{ selectedTab: sub.tab } as any}
                >
                  <sub.icon className="size-4" />
                  <span>{sub.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
};

// --- Project nav link (handles submenu chevron or normal link) ---

const ProjectNavLink = ({
  item,
  onSubmenuOpen
}: {
  item: NavItem;
  onSubmenuOpen?: (submenu: Submenu) => void;
}) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { pathname } = useLocation();

  const typePath = PROJECT_TYPE_PATH[currentProject.type];
  const basePath = `/organizations/${currentOrg.id}/projects/${typePath}/${currentProject.id}`;
  const fullPath = `${basePath}/${item.pathSuffix}`;
  const isActive = pathname.startsWith(fullPath) || Boolean(item.activeMatch?.test(pathname));

  if (item.submenu && onSubmenuOpen) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          scope="project"
          isActive={isActive}
          tooltip={item.label}
          onClick={() => onSubmenuOpen(item.submenu!)}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
          <ChevronRight className="ml-auto size-4 opacity-50" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" scope="project" asChild isActive={isActive} tooltip={item.label}>
        <Link
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          to={`/organizations/$orgId/projects/${typePath}/$projectId/${item.pathSuffix}` as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params={{ orgId: currentOrg.id, projectId: currentProject.id } as any}
        >
          <item.icon className="size-4" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
      {Boolean(item.badgeCount) && (
        <Badge variant="warning" className="absolute top-[10.5px] right-4">
          {item.badgeCount}
        </Badge>
      )}
    </SidebarMenuItem>
  );
};

const ProjectNavList = ({
  items,
  onSubmenuOpen
}: {
  items: NavItem[];
  onSubmenuOpen: (submenu: Submenu) => void;
}) => (
  <>
    {items
      .filter((i) => !i.hidden)
      .map((item) => (
        <ProjectNavLink
          key={item.label}
          item={item}
          onSubmenuOpen={item.submenu ? onSubmenuOpen : undefined}
        />
      ))}
  </>
);

// --- Org nav ---

const OrgNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const { currentOrg, isRootOrganization, isSubOrganization } = useOrganization();
  const { subscription } = useSubscription();
  const { pathname } = useLocation();
  const orgId = currentOrg.id;

  const items: OrgNavItem[] = [
    {
      label: "Overview",
      icon: isRootOrganization ? OrgIcon : SubOrgIcon,
      to: "/organizations/$orgId/projects",
      isActive: pathname === `/organizations/${orgId}/projects`
    },
    {
      label: "App Connections",
      icon: Cable,
      to: "/organizations/$orgId/app-connections",
      isActive: pathname.startsWith(`/organizations/${orgId}/app-connections`)
    },
    {
      label: "Networking",
      icon: Network,
      to: "/organizations/$orgId/networking",
      isActive: pathname.startsWith(`/organizations/${orgId}/networking`),
      submenu: NETWORKING_SUBMENU
    },
    {
      label: "Secret Sharing",
      icon: Share2,
      to: "/organizations/$orgId/secret-sharing",
      isActive: pathname.startsWith(`/organizations/${orgId}/secret-sharing`),
      submenu: getSecretSharingSubmenu({ isSubOrganization })
    },
    {
      label: "Audit Logs",
      icon: FileText,
      to: "/organizations/$orgId/audit-logs",
      isActive: pathname.startsWith(`/organizations/${orgId}/audit-logs`)
    },
    {
      label: "Access Control",
      icon: Shield,
      to: "/organizations/$orgId/access-management",
      isActive:
        pathname.startsWith(`/organizations/${orgId}/access-management`) ||
        Boolean(pathname.match(/organizations\/[^/]+\/(members|identities|groups|roles)/)),
      submenu: ORG_ACCESS_CONTROL_SUBMENU
    },
    ...(isRootOrganization
      ? [
          {
            label: "Usage & Billing",
            icon: CreditCard,
            to: "/organizations/$orgId/billing",
            isActive: pathname.startsWith(`/organizations/${orgId}/billing`)
          }
        ]
      : []),
    {
      label: "Settings",
      icon: Settings,
      to: "/organizations/$orgId/settings",
      isActive: pathname.startsWith(`/organizations/${orgId}/settings`),
      submenu: getOrgSettingsSubmenu({
        isSubOrganization,
        hasSubOrganization: Boolean(subscription?.subOrganization)
      })
    }
  ];

  return (
    <SidebarMenu>
      {items.map((item) =>
        item.submenu ? (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              size="lg"
              isActive={item.isActive}
              tooltip={item.label}
              onClick={() => onSubmenuOpen(item.submenu!)}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
              <ChevronRight
                className={twMerge(
                  "ml-auto size-4 !text-foreground",
                  !item.isActive && "opacity-50"
                )}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton asChild isActive={item.isActive} size="lg" tooltip={item.label}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={item.to as any} params={{ orgId } as any}>
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  );
};

// --- Project nav components per type ---

const SecretManagerNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const { currentProject, projectId } = useProject();

  const { data: secretApprovalReqCount } = useGetSecretApprovalRequestCount({ projectId });
  const { data: accessApprovalRequestCount } = useGetAccessRequestsCount({
    projectSlug: currentProject?.slug || ""
  });
  const { data: secretRotations } = useGetSecretRotations({
    workspaceId: projectId,
    options: { refetchOnMount: false }
  });

  const pendingRequestsCount =
    (secretApprovalReqCount?.open || 0) + (accessApprovalRequestCount?.pendingCount || 0);

  const items: NavItem[] = [
    {
      label: "Overview",
      icon: ProjectIcon,
      pathSuffix: "overview",
      activeMatch: /\/secrets\/|\/commits\//
    },
    {
      label: "Approvals",
      icon: BookCheck,
      pathSuffix: "approval",
      badgeCount: pendingRequestsCount || undefined
    },
    {
      label: "Integrations",
      icon: Plug,
      pathSuffix: "integrations",
      submenu: INTEGRATIONS_SUBMENU
    },
    {
      label: "Secret Rotations",
      icon: RefreshCw,
      pathSuffix: "secret-rotation",
      hidden: !secretRotations?.length
    },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: SECRET_MANAGER_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings", submenu: SM_SETTINGS_SUBMENU }
  ];

  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const KmsNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const items: NavItem[] = [
    { label: "Overview", icon: LayoutDashboard, pathSuffix: "overview" },
    { label: "KMIP", icon: Key, pathSuffix: "kmip" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const CertManagerNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const { currentProject } = useProject();
  const { subscription } = useSubscription();
  const { data: subscribers = [] } = useListWorkspacePkiSubscribers(currentProject?.id || "");
  const { data: templatesData } = useListWorkspaceCertificateTemplates({
    projectId: currentProject?.id || ""
  });
  const templates = templatesData?.certificateTemplates || [];

  const items: NavItem[] = [
    { label: "Certificates", icon: FileKey, pathSuffix: "policies" },
    { label: "Discovery", icon: Search, pathSuffix: "discovery", activeMatch: /\/discovery/ },
    {
      label: "Certificate Authorities",
      icon: ShieldCheck,
      pathSuffix: "certificate-authorities",
      activeMatch: /\/ca\//
    },
    {
      label: "Code Signing",
      icon: Lock,
      pathSuffix: "code-signing",
      activeMatch: /\/code-signing/
    },
    { label: "Alerting", icon: Bell, pathSuffix: "alerting" },
    { label: "Approvals", icon: BookCheck, pathSuffix: "approvals" },
    { label: "Integrations", icon: Plug, pathSuffix: "integrations" },
    { label: "App Connections", icon: Cable, pathSuffix: "app-connections" },
    {
      label: "Subscribers (Legacy)",
      icon: Monitor,
      pathSuffix: "subscribers",
      hidden: !(subscription.pkiLegacyTemplates || subscribers.length > 0)
    },
    {
      label: "Certificate Templates (Legacy)",
      icon: FileKey,
      pathSuffix: "certificate-templates",
      hidden: !(subscription.pkiLegacyTemplates || templates.length > 0)
    },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const SshNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const items: NavItem[] = [
    { label: "Hosts", icon: Server, pathSuffix: "overview", activeMatch: /\/ssh-host-groups\// },
    {
      label: "Certificate Authorities",
      icon: ShieldCheck,
      pathSuffix: "cas",
      activeMatch: /\/ca\//,
      permissionCheck: true
    },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];

  return (
    <>
      {items
        .filter((i) => !i.hidden)
        .map((item) => {
          if (item.permissionCheck) {
            return (
              <ProjectPermissionCan
                key={item.label}
                I={ProjectPermissionActions.Read}
                a={ProjectPermissionSub.SshCertificateAuthorities}
              >
                {(isAllowed) => (isAllowed ? <ProjectNavLink item={item} /> : null)}
              </ProjectPermissionCan>
            );
          }
          return (
            <ProjectNavLink
              key={item.label}
              item={item}
              onSubmenuOpen={item.submenu ? onSubmenuOpen : undefined}
            />
          );
        })}
    </>
  );
};

const PamNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const items: NavItem[] = [
    { label: "Resources", icon: Database, pathSuffix: "resources" },
    { label: "Sessions", icon: Video, pathSuffix: "sessions" },
    { label: "Discovery", icon: Search, pathSuffix: "discovery", activeMatch: /\/discovery\// },
    {
      label: "Approvals",
      icon: BookCheck,
      pathSuffix: "approvals",
      activeMatch: /\/approvals\//
    },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const AINav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const items: NavItem[] = [
    { label: "MCP", icon: Terminal, pathSuffix: "overview" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const SecretScanningNav = ({ onSubmenuOpen }: { onSubmenuOpen: (submenu: Submenu) => void }) => {
  const { currentProject } = useProject();
  const { permission } = useProjectPermission();
  const { subscription } = useSubscription();

  const { data: unresolvedFindings } = useGetSecretScanningUnresolvedFindingCount(
    currentProject.id,
    {
      enabled:
        subscription.secretScanning &&
        permission.can(
          ProjectPermissionSecretScanningFindingActions.Read,
          ProjectPermissionSub.SecretScanningFindings
        ),
      refetchInterval: 30000
    }
  );

  const items: NavItem[] = [
    { label: "Data Sources", icon: Database, pathSuffix: "data-sources" },
    {
      label: "Findings",
      icon: Search,
      pathSuffix: "findings",
      badgeCount: unresolvedFindings || undefined
    },
    { label: "App Connections", icon: Cable, pathSuffix: "app-connections" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      submenu: PROJECT_ACCESS_CONTROL_SUBMENU
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onSubmenuOpen={onSubmenuOpen} />;
};

const PROJECT_NAV_COMPONENT: Record<
  ProjectType,
  React.ComponentType<{ onSubmenuOpen: (submenu: Submenu) => void }>
> = {
  [ProjectType.SecretManager]: SecretManagerNav,
  [ProjectType.KMS]: KmsNav,
  [ProjectType.CertificateManager]: CertManagerNav,
  [ProjectType.SSH]: SshNav,
  [ProjectType.PAM]: PamNav,
  [ProjectType.AI]: AINav,
  [ProjectType.SecretScanning]: SecretScanningNav
};

// --- Project nav wrapper ---

const ProjectNav = () => {
  const { currentProject } = useProject();
  const { currentOrg } = useOrganization();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const NavComponent = PROJECT_NAV_COMPONENT[currentProject.type];

  const isOnAccessControl =
    pathname.includes("/access-management") ||
    Boolean(pathname.match(/\/groups\/|\/identities\/|\/members\/|\/roles\//));
  const isOnIntegrations = pathname.includes("/integrations");
  const isOnProjectSettings = pathname.endsWith("/settings") || pathname.includes("/settings?");

  const getInitialProjectSubmenu = (): Submenu | null => {
    if (isOnAccessControl) return PROJECT_ACCESS_CONTROL_SUBMENU;
    if (isOnIntegrations) return INTEGRATIONS_SUBMENU;
    if (isOnProjectSettings && currentProject.type === ProjectType.SecretManager)
      return SM_SETTINGS_SUBMENU;
    return null;
  };

  const [activeSubmenu, setActiveSubmenu] = useState<Submenu | null>(getInitialProjectSubmenu);

  const handleSubmenuOpen = (submenu: Submenu) => {
    setActiveSubmenu(submenu);
    const typePath = PROJECT_TYPE_PATH[currentProject.type];
    navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to: `/organizations/$orgId/projects/${typePath}/$projectId/${submenu.pathSuffix}` as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { orgId: currentOrg.id, projectId: currentProject.id } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { selectedTab: submenu.defaultTab } as any
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeSubmenu ? (
        <motion.div
          key="submenu"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <ProjectSubmenuView submenu={activeSubmenu} onBack={() => setActiveSubmenu(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <SidebarGroup>
            <SidebarMenu>
              <NavComponent onSubmenuOpen={handleSubmenuOpen} />
            </SidebarMenu>
          </SidebarGroup>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Org nav wrapper ---

const OrgNavWrapper = () => {
  const { currentOrg, isSubOrganization } = useOrganization();
  const { subscription } = useSubscription();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const orgId = currentOrg.id;

  const isOnAccessControl =
    pathname.startsWith(`/organizations/${orgId}/access-management`) ||
    Boolean(pathname.match(/organizations\/[^/]+\/(members|identities|groups|roles)/));
  const isOnSettings = pathname.startsWith(`/organizations/${orgId}/settings`);
  const isOnSecretSharing = pathname.startsWith(`/organizations/${orgId}/secret-sharing`);
  const isOnNetworking = pathname.startsWith(`/organizations/${orgId}/networking`);

  const getInitialSubmenu = (): Submenu | null => {
    if (isOnAccessControl) return ORG_ACCESS_CONTROL_SUBMENU;
    if (isOnSettings)
      return getOrgSettingsSubmenu({
        isSubOrganization,
        hasSubOrganization: Boolean(subscription?.subOrganization)
      });
    if (isOnSecretSharing) return getSecretSharingSubmenu({ isSubOrganization });
    if (isOnNetworking) return NETWORKING_SUBMENU;
    return null;
  };

  const [activeSubmenu, setActiveSubmenu] = useState<Submenu | null>(getInitialSubmenu);

  const handleSubmenuOpen = (submenu: Submenu) => {
    setActiveSubmenu(submenu);
    navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to: `/organizations/$orgId/${submenu.pathSuffix}` as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { orgId } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { selectedTab: submenu.defaultTab } as any
    });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeSubmenu ? (
        <motion.div
          key="submenu"
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <OrgSubmenuView submenu={activeSubmenu} onBack={() => setActiveSubmenu(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -30, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <SidebarGroup>
            <OrgNav onSubmenuOpen={handleSubmenuOpen} />
          </SidebarGroup>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Main sidebar ---

export const OrgSidebar = () => {
  const projectId = useParams({
    strict: false,
    select: (el) => el?.projectId
  });
  const isInsideProject = Boolean(projectId);
  const { isSubOrganization } = useOrganization();

  let scope: "project" | "sub-org" | "org" = "org";
  if (isInsideProject) scope = "project";
  else if (isSubOrganization) scope = "sub-org";

  return (
    <Sidebar scope={scope} collapsible="none" side="left">
      <SidebarContent>{isInsideProject ? <ProjectNav /> : <OrgNavWrapper />}</SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};
