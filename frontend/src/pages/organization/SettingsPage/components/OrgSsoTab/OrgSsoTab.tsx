import { Info } from "lucide-react";

import { UpgradePlanModal } from "@app/components/license/UpgradePlanModal";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldContent,
  FieldGroup,
  FieldTitle,
  PageLoader
} from "@app/components/v3";
import {
  OrgPermissionEmailDomainActions,
  OrgPermissionSsoActions,
  OrgPermissionSubjects,
  useOrganization,
  useOrgPermission,
  useServerConfig,
  useSubscription
} from "@app/context";
import { withPermission } from "@app/hoc";
import { usePopUp } from "@app/hooks";
import {
  useGetEmailDomains,
  useGetLDAPConfig,
  useGetOIDCConfig,
  useGetSSOConfig
} from "@app/hooks/api";
import { LoginMethod } from "@app/hooks/api/admin/types";

import { LDAPModal } from "./LDAPModal";
import { OIDCModal } from "./OIDCModal";
import { OrgEmailDomainsSection } from "./OrgEmailDomainsSection";
import { OrgGeneralAuthSection } from "./OrgGeneralAuthSection";
import { OrgLDAPSection } from "./OrgLDAPSection";
import { OrgOIDCSection } from "./OrgOIDCSection";
import { OrgSSOSection } from "./OrgSSOSection";
import { SSOModal } from "./SSOModal";

const EmailDomainAlert = () => (
  <Alert variant="info">
    <Info />
    <AlertTitle>Email domain verification required</AlertTitle>
    <AlertDescription>
      You must verify at least one email domain before configuring an identity provider. Add a
      domain in the Email Domains section above.
    </AlertDescription>
  </Alert>
);

export const OrgSsoTab = withPermission(
  () => {
    const {
      config: { enabledLoginMethods }
    } = useServerConfig();
    const { currentOrg } = useOrganization();
    const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
      "addLDAP",
      "addSSO",
      "addOIDC",
      "upgradePlan"
    ] as const);

    const { subscription } = useSubscription();
    const { permission } = useOrgPermission();

    const { data: emailDomains, isPending } = useGetEmailDomains(
      subscription?.emailDomainVerification ? currentOrg?.id : ""
    );

    const { data: oidcConfig, isPending: isLoadingOidcConfig } = useGetOIDCConfig(
      currentOrg?.id ?? ""
    );
    const { data: samlConfig, isPending: isLoadingSamlConfig } = useGetSSOConfig(
      currentOrg?.id ?? ""
    );

    const { data: ldapConfig, isPending: isLoadingLdapConfig } = useGetLDAPConfig(
      currentOrg?.id ?? ""
    );
    const areConfigsLoading = isLoadingOidcConfig || isLoadingSamlConfig || isLoadingLdapConfig;

    const shouldDisplaySection = (method: LoginMethod[] | LoginMethod) => {
      if (Array.isArray(method)) {
        return method.some((m) => !enabledLoginMethods || enabledLoginMethods.includes(m));
      }

      return !enabledLoginMethods || enabledLoginMethods.includes(method);
    };

    const isOidcConfigured = Boolean(oidcConfig && (oidcConfig.discoveryURL || oidcConfig.issuer));
    const isSamlConfigured =
      samlConfig && (samlConfig.entryPoint || samlConfig.issuer || samlConfig.cert);
    const isLdapConfigured = ldapConfig && ldapConfig.url;
    const isGoogleConfigured = shouldDisplaySection(LoginMethod.GOOGLE);

    const shouldShowCreateIdentityProviderView =
      !isOidcConfigured && !isSamlConfigured && !isLdapConfigured;

    const showEmailDomainAlert =
      Boolean(subscription?.emailDomainVerification) && !isPending && !emailDomains?.length;

    const canSeeEmailDomainAlert =
      showEmailDomainAlert &&
      permission.can(OrgPermissionEmailDomainActions.Read, OrgPermissionSubjects.EmailDomains);

    const anyProviderAvailable =
      shouldDisplaySection(LoginMethod.SAML) ||
      shouldDisplaySection(LoginMethod.OIDC) ||
      shouldDisplaySection(LoginMethod.LDAP);

    const createIdentityProviderView = anyProviderAvailable ? (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Connect an Identity Provider</CardTitle>
            <CardDescription>
              Connect your identity provider to simplify user management with options like SAML,
              OIDC, and LDAP.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {showEmailDomainAlert && <EmailDomainAlert />}
            <FieldGroup>
              {shouldDisplaySection(LoginMethod.SAML) && (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>SAML</FieldTitle>
                  </FieldContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!subscription?.samlSSO) {
                        handlePopUpOpen("upgradePlan", { featureName: "SAML SSO" });
                        return;
                      }

                      handlePopUpOpen("addSSO");
                    }}
                  >
                    Connect
                  </Button>
                </Field>
              )}
              {shouldDisplaySection(LoginMethod.OIDC) && (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>OIDC</FieldTitle>
                  </FieldContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!subscription?.oidcSSO) {
                        handlePopUpOpen("upgradePlan", { featureName: "OIDC SSO" });
                        return;
                      }

                      handlePopUpOpen("addOIDC");
                    }}
                  >
                    Connect
                  </Button>
                </Field>
              )}
              {shouldDisplaySection(LoginMethod.LDAP) && (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>LDAP</FieldTitle>
                  </FieldContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!subscription?.ldap) {
                        handlePopUpOpen("upgradePlan", {
                          featureName: "LDAP",
                          isEnterpriseFeature: true
                        });
                        return;
                      }

                      handlePopUpOpen("addLDAP");
                    }}
                  >
                    Connect
                  </Button>
                </Field>
              )}
            </FieldGroup>
          </CardContent>
        </Card>
        <SSOModal
          hideDelete
          popUp={popUp}
          handlePopUpClose={handlePopUpClose}
          handlePopUpToggle={handlePopUpToggle}
        />
        <OIDCModal
          hideDelete
          popUp={popUp}
          handlePopUpClose={handlePopUpClose}
          handlePopUpToggle={handlePopUpToggle}
        />
        <LDAPModal
          hideDelete
          popUp={popUp}
          handlePopUpClose={handlePopUpClose}
          handlePopUpToggle={handlePopUpToggle}
        />
      </>
    ) : (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Single Sign-On (SSO) has been disabled</EmptyTitle>
          <EmptyDescription>Contact your server administrator.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

    if (areConfigsLoading) {
      return <PageLoader />;
    }

    const showEnforcement = shouldDisplaySection([
      LoginMethod.SAML,
      LoginMethod.GOOGLE,
      LoginMethod.OIDC
    ]);

    return (
      <>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {shouldShowCreateIdentityProviderView ? (
              createIdentityProviderView
            ) : (
              <>
                {canSeeEmailDomainAlert && <EmailDomainAlert />}
                {isSamlConfigured && shouldDisplaySection(LoginMethod.SAML) && <OrgSSOSection />}
                {isOidcConfigured && shouldDisplaySection(LoginMethod.OIDC) && <OrgOIDCSection />}
                {isLdapConfigured && shouldDisplaySection(LoginMethod.LDAP) && <OrgLDAPSection />}
              </>
            )}
            <OrgEmailDomainsSection />
          </div>
          {showEnforcement && (
            <div className="flex flex-col gap-4">
              <OrgGeneralAuthSection
                isSamlConfigured={isSamlConfigured}
                isOidcConfigured={isOidcConfigured}
                isGoogleConfigured={isGoogleConfigured}
                isSamlActive={Boolean(samlConfig?.isActive)}
                isOidcActive={Boolean(oidcConfig?.isActive)}
                isLdapActive={Boolean(ldapConfig?.isActive)}
              />
            </div>
          )}
        </div>
        <UpgradePlanModal
          isOpen={popUp.upgradePlan.isOpen}
          onOpenChange={(isOpen) => handlePopUpToggle("upgradePlan", isOpen)}
          text={`Your current plan does not include access to ${popUp.upgradePlan.data?.featureName}. To unlock this feature, please upgrade to Infisical ${popUp.upgradePlan.data?.isEnterpriseFeature ? "Enterprise" : "Pro"} plan.`}
          isEnterpriseFeature={popUp.upgradePlan.data?.isEnterpriseFeature}
        />
      </>
    );
  },
  { action: OrgPermissionSsoActions.Read, subject: OrgPermissionSubjects.Sso }
);
