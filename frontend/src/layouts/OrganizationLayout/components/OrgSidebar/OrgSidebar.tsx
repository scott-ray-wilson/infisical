import { Link, useLocation, useParams } from "@tanstack/react-router";
import {
  Bell,
  BookCheck,
  Cable,
  CreditCard,
  Database,
  FileKey,
  FileText,
  Key,
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
  SidebarMenuItem,
  SidebarSeparator
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

const PROJECT_TYPE_NAME: Record<ProjectType, string> = {
  [ProjectType.SecretManager]: "Secrets Management",
  [ProjectType.CertificateManager]: "PKI",
  [ProjectType.SSH]: "SSH",
  [ProjectType.KMS]: "KMS",
  [ProjectType.PAM]: "PAM",
  [ProjectType.SecretScanning]: "Secret Scanning",
  [ProjectType.AI]: "Agent Sentinel"
};

// --- Nav item types ---

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathSuffix: string;
  activeMatch?: RegExp;
  badgeCount?: number;
  hidden?: boolean;
};

// --- Shared nav link component ---

const ProjectNavLink = ({ item }: { item: NavItem }) => {
  const { currentOrg } = useOrganization();
  const { currentProject } = useProject();
  const { pathname } = useLocation();

  const typePath = PROJECT_TYPE_PATH[currentProject.type];
  const basePath = `/organizations/${currentOrg.id}/projects/${typePath}/${currentProject.id}`;
  const fullPath = `${basePath}/${item.pathSuffix}`;
  const isActive = pathname.startsWith(fullPath) || Boolean(item.activeMatch?.test(pathname));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" asChild isActive={isActive} tooltip={item.label}>
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
        <Badge variant="warning" className="absolute top-3.5 right-2">
          {item.badgeCount}
        </Badge>
      )}
    </SidebarMenuItem>
  );
};

const ProjectNavList = ({ items }: { items: NavItem[] }) => (
  <>
    {items
      .filter((i) => !i.hidden)
      .map((item) => (
        <ProjectNavLink key={item.label} item={item} />
      ))}
  </>
);

// --- Org nav ---

const OrgNav = () => {
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
      label: "Access Control",
      icon: Shield,
      to: "/organizations/$orgId/access-management" as const,
      isActive:
        pathname.startsWith(`/organizations/${orgId}/access-management`) ||
        Boolean(pathname.match(/organizations\/[^/]+\/(members|identities|groups|roles)/))
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

  return (
    <SidebarMenu>
      {items.map((item) => (
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

const SecretManagerNav = () => {
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
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];

  return <ProjectNavList items={items} />;
};

const KmsNav = () => {
  const items: NavItem[] = [
    { label: "Overview", icon: LayoutDashboard, pathSuffix: "overview" },
    { label: "KMIP", icon: Key, pathSuffix: "kmip" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} />;
};

const CertManagerNav = () => {
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
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} />;
};

const SshNav = () => {
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
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
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
        return <ProjectNavLink key={item.label} item={item} />;
      })}
    </>
  );
};

const PamNav = () => {
  const items: NavItem[] = [
    { label: "Resources", icon: Database, pathSuffix: "resources" },
    { label: "Sessions", icon: Video, pathSuffix: "sessions" },
    { label: "Discovery", icon: Search, pathSuffix: "discovery", activeMatch: /\/discovery\// },
    { label: "Approvals", icon: BookCheck, pathSuffix: "approvals", activeMatch: /\/approvals\// },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} />;
};

const AINav = () => {
  const items: NavItem[] = [
    { label: "MCP", icon: Terminal, pathSuffix: "overview" },
    {
      label: "Access Control",
      icon: Shield,
      pathSuffix: "access-management",
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} />;
};

const SecretScanningNav = () => {
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
      activeMatch: /\/groups\/|\/identities\/|\/members\/|\/roles\//
    },
    { label: "Audit Logs", icon: FileText, pathSuffix: "audit-logs" },
    { label: "Settings", icon: Settings, pathSuffix: "settings" }
  ];
  return <ProjectNavList items={items} />;
};

const PROJECT_NAV_COMPONENT: Record<ProjectType, React.ComponentType> = {
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
  const NavComponent = PROJECT_NAV_COMPONENT[currentProject.type];

  return (
    <>
      {/* <SidebarSeparator /> */}
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2">
          <span className="truncate">{currentProject.name}</span>
          <Badge variant="project" className="shrink-0 text-[10px]">
            {PROJECT_TYPE_NAME[currentProject.type]}
          </Badge>
        </SidebarGroupLabel>
        <SidebarMenu>
          <NavComponent />
        </SidebarMenu>
      </SidebarGroup>
    </>
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
    <Sidebar collapsible="none" side="left">
      <SidebarContent>
        {isInsideProject ? (
          <ProjectNav />
        ) : (
          <SidebarGroup>
            <OrgNav />
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};
