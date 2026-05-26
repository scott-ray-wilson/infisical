import { subject } from "@casl/ability";
import { useParams } from "@tanstack/react-router";
import { EllipsisIcon, LockIcon } from "lucide-react";

import { createNotification } from "@app/components/notifications";
import { VariablePermissionCan } from "@app/components/permissions";
import { DeleteActionModal, Tooltip } from "@app/components/v2";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@app/components/v3";
import {
  OrgPermissionIdentityActions,
  OrgPermissionSubjects,
  ProjectPermissionIdentityActions,
  ProjectPermissionSub,
  useOrganization
} from "@app/context";
import { usePopUp } from "@app/hooks";
import {
  IdentityAuthMethod,
  identityAuthToNameMap,
  useDeleteIdentityAliCloudAuth,
  useDeleteIdentityAwsAuth,
  useDeleteIdentityAzureAuth,
  useDeleteIdentityGcpAuth,
  useDeleteIdentityJwtAuth,
  useDeleteIdentityKubernetesAuth,
  useDeleteIdentityLdapAuth,
  useDeleteIdentityOciAuth,
  useDeleteIdentityOidcAuth,
  useDeleteIdentitySpiffeAuth,
  useDeleteIdentityTlsCertAuth,
  useDeleteIdentityTokenAuth,
  useDeleteIdentityUniversalAuth
} from "@app/hooks/api";
import { IdentityAuthMethodModal } from "@app/pages/organization/AccessManagementPage/components/OrgIdentityTab/components/IdentitySection/IdentityAuthMethodModal";

import {
  IdentityAliCloudAuthContent,
  IdentityAwsAuthContent,
  IdentityAzureAuthContent,
  IdentityGcpAuthContent,
  IdentityJwtAuthContent,
  IdentityKubernetesAuthContent,
  IdentityLdapAuthContent,
  IdentityOciAuthContent,
  IdentityOidcAuthContent,
  IdentitySpiffeAuthContent,
  IdentityTlsCertAuthContent,
  IdentityTokenAuthContent,
  IdentityUniversalAuthContent
} from "./content";
import { ResetLockoutsButton } from "./helpers";

const AuthMethodComponentMap: Record<
  IdentityAuthMethod,
  React.ComponentType<{ identityId: string }>
> = {
  [IdentityAuthMethod.UNIVERSAL_AUTH]: IdentityUniversalAuthContent,
  [IdentityAuthMethod.TOKEN_AUTH]: IdentityTokenAuthContent,
  [IdentityAuthMethod.TLS_CERT_AUTH]: IdentityTlsCertAuthContent,
  [IdentityAuthMethod.KUBERNETES_AUTH]: IdentityKubernetesAuthContent,
  [IdentityAuthMethod.LDAP_AUTH]: IdentityLdapAuthContent,
  [IdentityAuthMethod.OCI_AUTH]: IdentityOciAuthContent,
  [IdentityAuthMethod.OIDC_AUTH]: IdentityOidcAuthContent,
  [IdentityAuthMethod.GCP_AUTH]: IdentityGcpAuthContent,
  [IdentityAuthMethod.AWS_AUTH]: IdentityAwsAuthContent,
  [IdentityAuthMethod.ALICLOUD_AUTH]: IdentityAliCloudAuthContent,
  [IdentityAuthMethod.AZURE_AUTH]: IdentityAzureAuthContent,
  [IdentityAuthMethod.JWT_AUTH]: IdentityJwtAuthContent,
  [IdentityAuthMethod.SPIFFE_AUTH]: IdentitySpiffeAuthContent
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identityId: string;
  identityName: string;
  authMethod: IdentityAuthMethod;
  allAuthMethods: IdentityAuthMethod[];
  isLockedOut: boolean;
  onMutated: () => void;
};

type RevokeArgs = { identityId: string; projectId?: string; organizationId?: string };
type RevokeFn = (args: RevokeArgs) => Promise<unknown>;

export const IdentityAuthMethodSheet = ({
  open,
  onOpenChange,
  identityId,
  identityName,
  authMethod,
  allAuthMethods,
  isLockedOut,
  onMutated
}: Props) => {
  const { projectId } = useParams({ strict: false });
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id || "";

  const { popUp, handlePopUpOpen, handlePopUpToggle } = usePopUp([
    "revokeAuthMethod",
    "identityAuthMethod",
    "upgradePlan"
  ] as const);

  const { mutateAsync: revokeUniversal } = useDeleteIdentityUniversalAuth();
  const { mutateAsync: revokeToken } = useDeleteIdentityTokenAuth();
  const { mutateAsync: revokeKubernetes } = useDeleteIdentityKubernetesAuth();
  const { mutateAsync: revokeGcp } = useDeleteIdentityGcpAuth();
  const { mutateAsync: revokeTlsCert } = useDeleteIdentityTlsCertAuth();
  const { mutateAsync: revokeAws } = useDeleteIdentityAwsAuth();
  const { mutateAsync: revokeAzure } = useDeleteIdentityAzureAuth();
  const { mutateAsync: revokeAliCloud } = useDeleteIdentityAliCloudAuth();
  const { mutateAsync: revokeOci } = useDeleteIdentityOciAuth();
  const { mutateAsync: revokeOidc } = useDeleteIdentityOidcAuth();
  const { mutateAsync: revokeJwt } = useDeleteIdentityJwtAuth();
  const { mutateAsync: revokeSpiffe } = useDeleteIdentitySpiffeAuth();
  const { mutateAsync: revokeLdap } = useDeleteIdentityLdapAuth();

  const revokeMap: Record<IdentityAuthMethod, RevokeFn> = {
    [IdentityAuthMethod.UNIVERSAL_AUTH]: revokeUniversal as RevokeFn,
    [IdentityAuthMethod.TOKEN_AUTH]: revokeToken as RevokeFn,
    [IdentityAuthMethod.KUBERNETES_AUTH]: revokeKubernetes as RevokeFn,
    [IdentityAuthMethod.GCP_AUTH]: revokeGcp as RevokeFn,
    [IdentityAuthMethod.TLS_CERT_AUTH]: revokeTlsCert as RevokeFn,
    [IdentityAuthMethod.AWS_AUTH]: revokeAws as RevokeFn,
    [IdentityAuthMethod.AZURE_AUTH]: revokeAzure as RevokeFn,
    [IdentityAuthMethod.ALICLOUD_AUTH]: revokeAliCloud as RevokeFn,
    [IdentityAuthMethod.OCI_AUTH]: revokeOci as RevokeFn,
    [IdentityAuthMethod.OIDC_AUTH]: revokeOidc as RevokeFn,
    [IdentityAuthMethod.JWT_AUTH]: revokeJwt as RevokeFn,
    [IdentityAuthMethod.SPIFFE_AUTH]: revokeSpiffe as RevokeFn,
    [IdentityAuthMethod.LDAP_AUTH]: revokeLdap as RevokeFn
  };

  const handleDelete = async () => {
    await revokeMap[authMethod]({
      identityId,
      ...(projectId ? { projectId } : { organizationId: orgId })
    });

    createNotification({
      text: "Successfully removed auth method",
      type: "success"
    });
    handlePopUpToggle("revokeAuthMethod", false);
    onMutated();
    onOpenChange(false);
  };

  const Content = AuthMethodComponentMap[authMethod];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-2xl">
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            {identityAuthToNameMap[authMethod]}
            {isLockedOut && (
              <Tooltip content="Auth method has active lockouts">
                <Badge isSquare variant="danger">
                  <LockIcon />
                </Badge>
              </Tooltip>
            )}
          </SheetTitle>
          <div className="flex items-center gap-2">
            {isLockedOut && (
              <ResetLockoutsButton
                identityId={identityId}
                authMethod={authMethod}
                onSuccess={onMutated}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton variant="ghost" size="xs" aria-label="Auth method options">
                  <EllipsisIcon />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <VariablePermissionCan
                  type={projectId ? "project" : "org"}
                  I={
                    projectId
                      ? ProjectPermissionIdentityActions.Edit
                      : OrgPermissionIdentityActions.Edit
                  }
                  a={
                    projectId
                      ? subject(ProjectPermissionSub.Identity, { identityId })
                      : OrgPermissionSubjects.Identity
                  }
                >
                  {(isAllowed) => (
                    <DropdownMenuItem
                      isDisabled={!isAllowed}
                      onClick={() =>
                        handlePopUpOpen("identityAuthMethod", {
                          identityId,
                          name: identityName,
                          allAuthMethods,
                          authMethod
                        })
                      }
                    >
                      Edit Auth Method
                    </DropdownMenuItem>
                  )}
                </VariablePermissionCan>
                <VariablePermissionCan
                  type={projectId ? "project" : "org"}
                  I={
                    projectId
                      ? ProjectPermissionIdentityActions.Delete
                      : OrgPermissionIdentityActions.Delete
                  }
                  a={
                    projectId
                      ? subject(ProjectPermissionSub.Identity, { identityId })
                      : OrgPermissionSubjects.Identity
                  }
                >
                  {(isAllowed) => (
                    <DropdownMenuItem
                      isDisabled={!isAllowed}
                      variant="danger"
                      onClick={() => handlePopUpOpen("revokeAuthMethod")}
                    >
                      Remove Auth Method
                    </DropdownMenuItem>
                  )}
                </VariablePermissionCan>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>
        <div className="thin-scrollbar flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Content identityId={identityId} />
          </div>
        </div>

        <DeleteActionModal
          isOpen={popUp.revokeAuthMethod.isOpen}
          title={`Are you sure you want to remove ${identityAuthToNameMap[authMethod]} on this identity?`}
          onChange={(isOpen) => handlePopUpToggle("revokeAuthMethod", isOpen)}
          deleteKey="confirm"
          buttonText="Remove"
          onDeleteApproved={handleDelete}
        />
        <IdentityAuthMethodModal
          popUp={popUp}
          handlePopUpOpen={handlePopUpOpen}
          handlePopUpToggle={handlePopUpToggle}
        />
      </SheetContent>
    </Sheet>
  );
};
