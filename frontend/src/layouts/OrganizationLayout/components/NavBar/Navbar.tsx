import { useEffect, useState } from "react";
import { faGithub, faSlack } from "@fortawesome/free-brands-svg-icons";
import { faCircleQuestion, faUserCircle } from "@fortawesome/free-regular-svg-icons";
import {
  faArrowUpRightFromSquare,
  faBook,
  faEnvelope,
  faExclamationTriangle,
  faInfinity,
  faInfo,
  faInfoCircle,
  faSignOut,
  faToolbox,
  faUser,
  faUserCog,
  faUserPlus,
  faUsers
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { UserPlusIcon } from "lucide-react";

import { Mfa } from "@app/components/auth/Mfa";
import { createNotification } from "@app/components/notifications";
import { OrgPermissionCan } from "@app/components/permissions";
import SecurityClient from "@app/components/utilities/SecurityClient";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Modal,
  ModalContent,
  Tooltip
} from "@app/components/v2";
import { InstanceIcon } from "@app/components/v3";
import { envConfig } from "@app/config/env";
import {
  OrgPermissionActions,
  OrgPermissionSubjects,
  useOrganization,
  useSubscription,
  useUser
} from "@app/context";
import { isInfisicalCloud } from "@app/helpers/platform";
import { useToggle } from "@app/hooks";
import { projectKeys, useGetOrganizations, useGetOrgTrialUrl, useLogoutUser } from "@app/hooks/api";
import { authKeys, selectOrganization } from "@app/hooks/api/auth/queries";
import { MfaMethod } from "@app/hooks/api/auth/types";
import { getAuthToken } from "@app/hooks/api/reactQuery";
import { SubscriptionPlan } from "@app/hooks/api/types";
import { ProjectSelect } from "@app/layouts/ProjectLayout/components/ProjectSelect";
import { navigateUserToOrg } from "@app/pages/auth/LoginPage/Login.utils";

import { ServerAdminsPanel } from "../ServerAdminsPanel/ServerAdminsPanel";
import { NotificationDropdown } from "./NotificationDropdown";

const getPlan = (subscription: SubscriptionPlan) => {
  if (subscription.groups) return "Enterprise";
  if (subscription.pitRecovery) return "Pro";
  return "Free";
};

const getFormattedSupportEmailLink = (variables: {
  org_id: string;
  domain: string;
  root_org_id?: string;
}) => {
  const email = "support@infisical.com";

  const body = `Hello Infisical Support Team,

Issue Details:
[What you did]
[What you expected to happen]
[What actually happened]
[Any error request IDs]
[Any supporting screenshots or video recording of the issue/request at hand]

Account Info:
- Organization ID: ${variables.org_id}
${variables.root_org_id ? `- Root Organization ID: ${variables.root_org_id}` : ""}
- Domain: ${variables.domain}

Thank you,
[Your Name]`;

  return `mailto:${email}?body=${encodeURIComponent(body)}`;
};

export const INFISICAL_SUPPORT_OPTIONS = [
  [
    <FontAwesomeIcon key={1} className="pr-4 text-sm" icon={faSlack} />,
    "Support Forum",
    () => "https://infisical.com/slack"
  ],
  [
    <FontAwesomeIcon key={2} className="pr-4 text-sm" icon={faBook} />,
    "Read Docs",
    () => "https://infisical.com/docs/documentation/getting-started/introduction"
  ],
  [
    <FontAwesomeIcon key={3} className="pr-4 text-sm" icon={faGithub} />,
    "GitHub Issues",
    () => "https://github.com/Infisical/infisical/issues"
  ],
  [
    <FontAwesomeIcon key={4} className="pr-4 text-sm" icon={faEnvelope} />,
    "Email Support",
    getFormattedSupportEmailLink
  ],
  [
    <FontAwesomeIcon key={5} className="pr-4 text-sm" icon={faUsers} />,
    "Instance Admins",
    () => "server-admins"
  ],
  [
    <FontAwesomeIcon key={6} className="pr-4 text-sm" icon={faToolbox} />,
    "Version Upgrade Tool",
    () => "/upgrade-path"
  ]
] as const;

export const Navbar = () => {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const { currentOrg, isSubOrganization } = useOrganization();

  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [showCardDeclinedModal, setShowCardDeclinedModal] = useState(false);

  const isCardDeclined = Boolean(subscription?.cardDeclined);
  const isCardDeclinedMoreThan30Days = Boolean(
    isCardDeclined && subscription?.cardDeclinedDays && subscription?.cardDeclinedDays >= 30
  );

  const { data: orgs } = useGetOrganizations();
  const navigate = useNavigate();
  const [requiredMfaMethod, setRequiredMfaMethod] = useState(MfaMethod.EMAIL);
  const [mfaSuccessCallback, setMfaSuccessCallback] = useState<() => void>(() => {});
  const [shouldShowMfa, toggleShowMfa] = useToggle(false);
  const queryClient = useQueryClient();

  const location = useLocation();
  const isBillingPage = location.pathname === `/organizations/${currentOrg.id}/billing`;

  const isModalIntrusive = Boolean(!isBillingPage && isCardDeclinedMoreThan30Days);

  const rootOrg = isSubOrganization
    ? orgs?.find((org) => org.id === currentOrg.rootOrgId) || currentOrg
    : currentOrg;

  useEffect(() => {
    if (isModalIntrusive) {
      setShowCardDeclinedModal(true);
      sessionStorage.setItem("paymentFailed", "true");
      return;
    }

    if (isCardDeclined && !sessionStorage.getItem("paymentFailed")) {
      sessionStorage.setItem("paymentFailed", "true");
      setShowCardDeclinedModal(true);
    }
  }, [subscription, isBillingPage, isModalIntrusive]);

  const handleOrgSelection = async ({
    organizationId,
    navigateTo,
    onSuccess
  }: {
    organizationId?: string;
    navigateTo?: string;
    onSuccess?: () => void | Promise<void>;
  }) => {
    if (!organizationId) return;

    if (organizationId === currentOrg.id) return;

    const { token, isMfaEnabled, mfaMethod } = await selectOrganization({ organizationId });

    if (isMfaEnabled) {
      SecurityClient.setMfaToken(token);
      if (mfaMethod) {
        setRequiredMfaMethod(mfaMethod);
      }
      toggleShowMfa.on();
      setMfaSuccessCallback(() => async () => {
        await handleOrgSelection({ organizationId, onSuccess });
      });
      return;
    }

    SecurityClient.setToken(token);
    SecurityClient.setProviderAuthToken("");
    queryClient.removeQueries({ queryKey: authKeys.getAuthToken });

    await queryClient.refetchQueries({ queryKey: authKeys.getAuthToken });

    await navigateUserToOrg({ navigate, organizationId, navigateTo });
    queryClient.removeQueries({ queryKey: projectKeys.allProjectQueries() });

    if (onSuccess) {
      await onSuccess();
    }
  };

  const handleNavigateToRootOrgBilling = async () => {
    const navigateToBilling = () => {
      navigate({
        to: "/organizations/$orgId/billing",
        params: { orgId: rootOrg.id }
      });
    };

    const onSuccess = () => {
      setShowCardDeclinedModal(false);
    };

    if (isSubOrganization) {
      await handleOrgSelection({ organizationId: rootOrg.id, onSuccess });
    } else {
      await navigateToBilling();
    }
  };

  const handleNavigateToAdminConsole = async () => {
    const navigateToAdminConsole = () => {
      navigate({
        to: "/admin"
      });
    };

    if (isSubOrganization) {
      await handleOrgSelection({ organizationId: rootOrg.id, navigateTo: "/admin" });
    } else {
      navigateToAdminConsole();
    }
  };

  const { mutateAsync } = useGetOrgTrialUrl();

  const logout = useLogoutUser();
  const logOutUser = async () => {
    try {
      console.log("Logging out...");
      await logout.mutateAsync();
      navigate({ to: "/login" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyToken = async () => {
    try {
      await window.navigator.clipboard.writeText(getAuthToken());
      createNotification({
        type: "success",
        text: "Copied current login session token to clipboard"
      });
    } catch (error) {
      console.log(error);
      createNotification({ type: "error", text: "Failed to copy user token to clipboard" });
    }
  };

  if (shouldShowMfa) {
    return (
      <div className="flex max-h-screen min-h-screen flex-col items-center justify-center gap-2 overflow-y-auto bg-linear-to-tr from-mineshaft-600 via-mineshaft-800 to-bunker-700">
        <Mfa
          email={user.email as string}
          method={requiredMfaMethod}
          successCallback={mfaSuccessCallback}
          closeMfa={() => toggleShowMfa.off()}
        />
      </div>
    );
  }

  const isServerAdminPanel = location.pathname.startsWith("/admin");

  const isProjectScope =
    location.pathname.startsWith(`/organizations/${currentOrg.id}/projects`) &&
    location.pathname !== `/organizations/${currentOrg.id}/projects`;

  return (
    <div className="z-10 flex min-h-12 items-center border-b border-border bg-card px-4">
      <div className="mr-auto flex h-full items-center">
        {/* eslint-disable-next-line no-nested-ternary */}
        {isServerAdminPanel ? (
          <Link
            to="/admin"
            className="group flex cursor-pointer items-center gap-2 text-sm text-white transition-all duration-100 hover:text-primary"
          >
            <InstanceIcon className="size-3.5 text-xs text-bunker-300" />
            <div className="whitespace-nowrap">Server Console</div>
          </Link>
        ) : isProjectScope ? (
          <ProjectSelect />
        ) : null}
      </div>

      {subscription && subscription.slug === "starter" && !subscription.has_used_trial ? (
        <Tooltip content="Start Free Pro Trial">
          <Button
            variant="plain"
            className="mr-2 border-mineshaft-500 px-2.5 py-1.5 whitespace-nowrap text-mineshaft-200 hover:bg-mineshaft-600"
            leftIcon={<FontAwesomeIcon icon={faInfinity} />}
            onClick={async () => {
              if (!subscription || !rootOrg) return;

              // direct user to start pro trial
              const url = await mutateAsync({
                orgId: rootOrg.id,
                success_url: window.location.href
              });

              window.location.href = url;
            }}
          >
            Free Pro Trial
          </Button>
        </Tooltip>
      ) : (
        <div className="mt-0.5 mr-3 hidden rounded-sm border border-mineshaft-400 px-1 text-xs text-mineshaft-100 no-underline! opacity-50 md:inline-block">
          {getPlan(subscription)}
        </div>
      )}
      {/* eslint-disable-next-line no-nested-ternary */}
      {!location.pathname.startsWith("/admin") ? (
        user.superAdmin ? (
          <Link
            className="mr-2 flex h-[34px] items-center rounded-md border border-mineshaft-500 px-2.5 py-1.5 text-sm whitespace-nowrap text-mineshaft-200 hover:bg-mineshaft-600"
            to="/admin"
            onClick={handleNavigateToAdminConsole}
          >
            <InstanceIcon className="inline-block size-3.5" />
            <span className="ml-2 hidden md:inline-block">Server Console</span>
          </Link>
        ) : (
          <OrgPermissionCan I={OrgPermissionActions.Create} a={OrgPermissionSubjects.Member}>
            {(isAllowed) =>
              isAllowed ? (
                <Link
                  className="mr-2 flex h-[34px] items-center rounded-md border border-mineshaft-500 px-2.5 py-1.5 text-sm whitespace-nowrap text-mineshaft-200 hover:bg-mineshaft-600"
                  to="/organizations/$orgId/access-management"
                  params={{ orgId: currentOrg.id }}
                  search={{
                    selectedTab: "members",
                    action: "invite-members"
                  }}
                >
                  <UserPlusIcon className="inline-block size-3.5" />
                  <span className="ml-2 hidden md:inline-block">Invite Users</span>
                </Link>
              ) : null
            }
          </OrgPermissionCan>
        )
      ) : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger>
          <div className="rounded-l-md border border-r-0 border-mineshaft-500 px-2.5 py-1 hover:bg-mineshaft-600">
            <FontAwesomeIcon icon={faCircleQuestion} className="text-mineshaft-200" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="mt-3 p-1">
          {INFISICAL_SUPPORT_OPTIONS.map(([icon, text, getUrl]) => {
            const url =
              text === "Email Support"
                ? getUrl({
                    org_id: currentOrg.id,
                    domain: window.location.origin,
                    ...(isSubOrganization && { root_org_id: rootOrg.id })
                  })
                : getUrl();

            if (url === "server-admins" && isInfisicalCloud()) {
              return null;
            }
            if (url === "upgrade-path" && isInfisicalCloud()) {
              return null;
            }
            return (
              <DropdownMenuItem key={url as string}>
                {url === "server-admins" ? (
                  <button
                    type="button"
                    onClick={() => setShowAdminsModal(true)}
                    className="flex w-full items-center rounded-md font-normal text-mineshaft-300 duration-200"
                  >
                    <div className="relative flex w-full cursor-pointer items-center justify-start rounded-md select-none">
                      {icon}
                      <div className="text-sm">{text}</div>
                    </div>
                  </button>
                ) : (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={String(url)}
                    className="flex w-full items-center rounded-md font-normal text-mineshaft-300 duration-200"
                  >
                    <div className="relative flex w-full cursor-pointer items-center justify-start rounded-md select-none">
                      {icon}
                      <div className="text-sm">{text}</div>
                    </div>
                  </a>
                )}
              </DropdownMenuItem>
            );
          })}
          {envConfig.PLATFORM_VERSION && (
            <div className="mt-2 mb-2 w-full cursor-default pl-5 text-sm duration-200 hover:text-mineshaft-200">
              <FontAwesomeIcon icon={faInfo} className="mr-4 px-[0.1rem]" />
              Version: {envConfig.PLATFORM_VERSION}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <NotificationDropdown />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <div className="rounded-r-md border border-mineshaft-500 px-2.5 py-1 hover:bg-mineshaft-600">
            <FontAwesomeIcon icon={faUserCircle} className="text-mineshaft-200" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="mt-3 p-1">
          <div className="cursor-default px-1 py-1">
            <div className="flex w-full items-center justify-center rounded-md border border-mineshaft-600 bg-linear-to-tr from-primary-500/10 to-mineshaft-800 p-1 px-2 transition-all duration-150">
              <div className="p-1 pr-3">
                <FontAwesomeIcon icon={faUser} className="text-xl text-mineshaft-400" />
              </div>
              <div className="flex grow flex-col text-white">
                <div className="max-w-36 truncate text-sm font-medium text-ellipsis capitalize">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-mineshaft-300">{user.email}</div>
              </div>
            </div>
          </div>
          <Link to="/personal-settings">
            <DropdownMenuItem icon={<FontAwesomeIcon icon={faUserCog} />}>
              Personal Settings
            </DropdownMenuItem>
          </Link>
          <OrgPermissionCan I={OrgPermissionActions.Create} a={OrgPermissionSubjects.Member}>
            {(isAllowed) =>
              isAllowed ? (
                <Link
                  to="/organizations/$orgId/access-management"
                  params={{ orgId: currentOrg.id }}
                  search={{
                    selectedTab: "members",
                    action: "invite-members"
                  }}
                >
                  <DropdownMenuItem icon={<FontAwesomeIcon icon={faUserPlus} />}>
                    Invite Users
                  </DropdownMenuItem>
                </Link>
              ) : null
            }
          </OrgPermissionCan>
          <a
            href="https://infisical.com/docs/documentation/getting-started/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full text-sm leading-[1.2rem] font-normal text-mineshaft-300 hover:text-mineshaft-100"
          >
            <DropdownMenuItem>
              Documentation
              <FontAwesomeIcon
                icon={faArrowUpRightFromSquare}
                className="text-xxs mb-[0.06rem] pl-1.5"
              />
            </DropdownMenuItem>
          </a>
          <a
            href="https://infisical.com/slack"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full text-sm leading-[1.2rem] font-normal text-mineshaft-300 hover:text-mineshaft-100"
          >
            <DropdownMenuItem>
              Join Slack Community
              <FontAwesomeIcon
                icon={faArrowUpRightFromSquare}
                className="text-xxs mb-[0.06rem] pl-1.5"
              />
            </DropdownMenuItem>
          </a>
          <div className="mt-1 h-1 border-t border-mineshaft-600" />
          <DropdownMenuItem onClick={handleCopyToken}>
            Copy Token
            <Tooltip
              content="This token is linked to your current login session and can only access resources within the organization you're currently logged into."
              className="max-w-3xl"
            >
              <FontAwesomeIcon icon={faInfoCircle} className="pl-1.5 text-xs" />
            </Tooltip>
          </DropdownMenuItem>
          <div className="mt-1 h-1 border-t border-mineshaft-600" />
          <DropdownMenuItem onClick={logOutUser} icon={<FontAwesomeIcon icon={faSignOut} />}>
            Log Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        isOpen={showCardDeclinedModal}
        onOpenChange={() => !isModalIntrusive && setShowCardDeclinedModal(false)}
      >
        <ModalContent
          title={
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-lg text-primary-400" />
              Your payment could not be processed.
            </div>
          }
          showCloseButton={!isModalIntrusive}
        >
          <div>
            <div>
              <div className="mb-1">
                <p>
                  We were unable to process your last payment
                  {subscription.cardDeclinedReason ? `: ${subscription.cardDeclinedReason}` : ""}.
                  Please update your payment information to continue using premium features.
                </p>
              </div>
              <div className="mt-4">
                <div className="flex space-x-3">
                  <Button
                    colorSchema="primary"
                    variant="solid"
                    onClick={handleNavigateToRootOrgBilling}
                  >
                    Update Payment Method
                  </Button>
                  {!isModalIntrusive && (
                    <Button
                      colorSchema="secondary"
                      variant="outline"
                      onClick={() => setShowCardDeclinedModal(false)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalContent>
      </Modal>
      <Modal isOpen={showAdminsModal} onOpenChange={setShowAdminsModal}>
        <ModalContent title="Server Administrators" subTitle="View all server administrators">
          <div className="mb-2">
            <ServerAdminsPanel />
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};
