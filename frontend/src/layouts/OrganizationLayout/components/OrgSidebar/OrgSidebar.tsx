import { useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  Bell,
  BookCheck,
  Cable,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  FileKey,
  FileText,
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
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Terminal,
  User,
  Users,
  Video
} from "lucide-react";

import { ProjectPermissionCan } from "@app/components/permissions";
import {
  Badge,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
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

// --- Nav item types ---

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathSuffix: string;
  activeMatch?: RegExp;
  badgeCount?: number;
  hidden?: boolean;
  hasSubmenu?: boolean;
};

// --- Shared nav link component ---

const ProjectNavLink = ({ item, onSubmenuOpen }: { item: NavItem; onSubmenuOpen?: () => void }) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { pathname } = useLocation();

  const typePath = PROJECT_TYPE_PATH[currentProject.type];
  const basePath = `/organizations/${currentOrg.id}/projects/${typePath}/${currentProject.id}`;
  const fullPath = `${basePath}/${item.pathSuffix}`;
  const isActive = pathname.startsWith(fullPath) || Boolean(item.activeMatch?.test(pathname));

  if (item.hasSubmenu && onSubmenuOpen) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          scope="project"
          isActive={isActive}
          tooltip={item.label}
          onClick={onSubmenuOpen}
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
  onAccessControlOpen
}: {
  items: NavItem[];
  onAccessControlOpen?: () => void;
}) => (
  <>
    {items
      .filter((i) => !i.hidden)
      .map((item) => (
        <ProjectNavLink
          key={item.label}
          item={item}
          onSubmenuOpen={item.hasSubmenu ? onAccessControlOpen : undefined}
        />
      ))}
  </>
);

// --- Access Control sub-nav for projects ---

const ProjectAccessControlNav = ({ onBack }: { onBack: () => void }) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { pathname } = useLocation();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;

  const typePath = PROJECT_TYPE_PATH[currentProject.type];
  const basePath = `/organizations/${currentOrg.id}/projects/${typePath}/${currentProject.id}`;
  const isSecretManager = currentProject.type === ProjectType.SecretManager;
  const isOnPage = pathname.startsWith(`${basePath}/access-management`);
  const currentTab = searchParams?.selectedTab;

  const subItems = [
    { label: "Members", icon: Users, tab: "members" },
    { label: "Groups", icon: Users, tab: "groups" },
    { label: "Machine Identities", icon: KeyRound, tab: "identities" },
    ...(isSecretManager ? [{ label: "Service Tokens", icon: Key, tab: "service-tokens" }] : []),
    { label: "Roles", icon: Shield, tab: "roles" }
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          className="cursor-pointer hover:bg-foreground/[0.025]"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft />
          <span>Access Control</span>
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {subItems.map((sub) => {
          const isActive =
            isOnPage && (currentTab === sub.tab || (!currentTab && sub.tab === "members"));

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
                    `/organizations/$orgId/projects/${typePath}/$projectId/access-management` as any
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

// --- Access Control sub-nav for org ---

const OrgAccessControlNav = ({ onBack }: { onBack: () => void }) => {
  const { currentOrg } = useOrganization();
  const { pathname } = useLocation();
  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const orgId = currentOrg.id;

  const isOnPage = pathname.startsWith(`/organizations/${orgId}/access-management`);
  const currentTab = searchParams?.selectedTab;

  const subItems = [
    { label: "Members", icon: User, tab: "members" },
    { label: "Groups", icon: Users, tab: "groups" },
    { label: "Machine Identities", icon: HardDrive, tab: "identities" },
    { label: "Roles", icon: IdCardLanyard, tab: "roles" }
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel asChild>
        <button
          className="cursor-pointer hover:bg-foreground/[0.025]"
          type="button"
          onClick={onBack}
        >
          <ChevronLeft />
          <span>Access Control</span>
        </button>
      </SidebarGroupLabel>
      <SidebarMenu>
        {subItems.map((sub) => {
          const isActive =
            isOnPage && (currentTab === sub.tab || (!currentTab && sub.tab === "members"));

          return (
            <SidebarMenuItem key={sub.label}>
              <SidebarMenuButton size="lg" asChild isActive={isActive} tooltip={sub.label}>
                <Link
                  to="/organizations/$orgId/access-management"
                  params={{ orgId }}
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

// --- Org nav ---

const OrgNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
  const { currentOrg, isRootOrganization } = useOrganization();
  const { pathname } = useLocation();
  const orgId = currentOrg.id;

  const items = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      to: "/organizations/$orgId/projects" as const,
      isActive: pathname === `/organizations/${orgId}/projects`
    },
    {
      label: "App Connections",
      icon: Cable,
      to: "/organizations/$orgId/app-connections" as const,
      isActive: pathname.startsWith(`/organizations/${orgId}/app-connections`)
    },
    {
      label: "Networking",
      icon: Network,
      to: "/organizations/$orgId/networking" as const,
      isActive: pathname.startsWith(`/organizations/${orgId}/networking`)
    },
    {
      label: "Secret Sharing",
      icon: Share2,
      to: "/organizations/$orgId/secret-sharing" as const,
      isActive: pathname.startsWith(`/organizations/${orgId}/secret-sharing`)
    },
    {
      label: "Audit Logs",
      icon: FileText,
      to: "/organizations/$orgId/audit-logs" as const,
      isActive: pathname.startsWith(`/organizations/${orgId}/audit-logs`)
    },
    ...(isRootOrganization
      ? [
          {
            label: "Usage & Billing",
            icon: CreditCard,
            to: "/organizations/$orgId/billing" as const,
            isActive: pathname.startsWith(`/organizations/${orgId}/billing`)
          }
        ]
      : []),
    {
      label: "Settings",
      icon: Settings,
      to: "/organizations/$orgId/settings" as const,
      isActive: pathname.startsWith(`/organizations/${orgId}/settings`)
    }
  ];

  const accessControlActive =
    pathname.startsWith(`/organizations/${orgId}/access-management`) ||
    Boolean(pathname.match(/organizations\/[^/]+\/(members|identities|groups|roles)/));

  // Insert Access Control after Audit Logs
  const auditLogsIdx = items.findIndex((i) => i.label === "Audit Logs");
  const insertIdx = auditLogsIdx >= 0 ? auditLogsIdx + 1 : items.length;

  return (
    <SidebarMenu>
      {items.slice(0, insertIdx).map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild isActive={item.isActive} size="lg" tooltip={item.label}>
            <Link to={item.to} params={{ orgId }}>
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          isActive={accessControlActive}
          tooltip="Access Control"
          onClick={onAccessControlOpen}
        >
          <Shield className="size-4" />
          <span>Access Control</span>
          <ChevronRight className="ml-auto size-4 opacity-50" />
        </SidebarMenuButton>
      </SidebarMenuItem>
      {items.slice(insertIdx).map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild isActive={item.isActive} size="lg" tooltip={item.label}>
            <Link to={item.to} params={{ orgId }}>
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

// --- Project nav components per type ---

const SecretManagerNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
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
      icon: LayoutDashboard,
      pathSuffix: "overview",
      activeMatch: /\/secrets\/|\/commits\//
    },
    {
      label: "Approvals",
      icon: BookCheck,
      pathSuffix: "approval",
      badgeCount: pendingRequestsCount || undefined
    },
    { label: "Integrations", icon: Plug, pathSuffix: "integrations" },
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
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];

  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const KmsNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
  const items: NavItem[] = [
    { label: "Overview", icon: LayoutDashboard, pathSuffix: "overview" },
    { label: "KMIP", icon: Key, pathSuffix: "kmip" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const CertManagerNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
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
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const SshNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
  const items: NavItem[] = [
    { label: "Hosts", icon: Server, pathSuffix: "overview", activeMatch: /\/ssh-host-groups\// },
    {
      label: "Certificate Authorities",
      icon: ShieldCheck,
      pathSuffix: "cas",
      activeMatch: /\/ca\//
    },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];

  return (
    <>
      {items.map((item) => {
        if (item.label === "Certificate Authorities") {
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
            onSubmenuOpen={item.hasSubmenu ? onAccessControlOpen : undefined}
          />
        );
      })}
    </>
  );
};

const PamNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
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
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const AINav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
  const items: NavItem[] = [
    { label: "MCP", icon: Terminal, pathSuffix: "overview" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//,
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const SecretScanningNav = ({ onAccessControlOpen }: { onAccessControlOpen: () => void }) => {
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
      hasSubmenu: true
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} onAccessControlOpen={onAccessControlOpen} />;
};

const PROJECT_NAV_COMPONENT: Record<
  ProjectType,
  React.ComponentType<{ onAccessControlOpen: () => void }>
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

  const [showAccessControl, setShowAccessControl] = useState(isOnAccessControl);

  if (showAccessControl) {
    return <ProjectAccessControlNav onBack={() => setShowAccessControl(false)} />;
  }

  const handleAccessControlOpen = () => {
    setShowAccessControl(true);
    const typePath = PROJECT_TYPE_PATH[currentProject.type];
    navigate({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to: `/organizations/$orgId/projects/${typePath}/$projectId/access-management` as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: { orgId: currentOrg.id, projectId: currentProject.id } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search: { selectedTab: "members" } as any
    });
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        <NavComponent onAccessControlOpen={handleAccessControlOpen} />
      </SidebarMenu>
    </SidebarGroup>
  );
};

// --- Org nav wrapper ---

const OrgNavWrapper = () => {
  const { currentOrg } = useOrganization();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const orgId = currentOrg.id;

  const isOnAccessControl =
    pathname.startsWith(`/organizations/${orgId}/access-management`) ||
    Boolean(pathname.match(/organizations\/[^/]+\/(members|identities|groups|roles)/));

  const [showAccessControl, setShowAccessControl] = useState(isOnAccessControl);

  if (showAccessControl) {
    return <OrgAccessControlNav onBack={() => setShowAccessControl(false)} />;
  }

  const handleAccessControlOpen = () => {
    setShowAccessControl(true);
    navigate({
      to: "/organizations/$orgId/access-management",
      params: { orgId },
      search: { selectedTab: "members" }
    });
  };

  return (
    <SidebarGroup>
      <OrgNav onAccessControlOpen={handleAccessControlOpen} />
    </SidebarGroup>
  );
};

// --- Main sidebar ---

export const OrgSidebar = () => {
  const projectId = useParams({
    strict: false,
    select: (el) => el?.projectId
  });
  const isInsideProject = Boolean(projectId);

  return (
    <Sidebar scope={isInsideProject ? "project" : "org"} collapsible="none" side="left">
      <SidebarContent>{isInsideProject ? <ProjectNav /> : <OrgNavWrapper />}</SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};
