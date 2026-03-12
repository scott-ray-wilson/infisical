import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";

import {
  Button,
  UnstableCard,
  UnstableCardContent,
  UnstableCardHeader,
  UnstableCardTitle
} from "@app/components/v3";
import { useAddUsersToOrg } from "@app/hooks/api";
import { useFetchServerStatus } from "@app/hooks/api/serverDetails";
import { usePopUp } from "@app/hooks/usePopUp";

import { EmailServiceSetupModal } from "../v2";

/**
 * This is the last step of the signup flow. People can optionally invite their teammates here.
 */
export default function TeamInviteStep(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [emails, setEmails] = useState("");
  const { data: serverDetails } = useFetchServerStatus();

  const { mutateAsync } = useAddUsersToOrg();
  const { handlePopUpToggle, popUp, handlePopUpOpen } = usePopUp(["setUpEmail"] as const);

  const orgId = String(localStorage.getItem("orgData.id"));

  // Redirect user to the getting started page
  const redirectToHome = async () => {
    navigate({
      to: orgId ? ("/organizations/$orgId/projects" as const) : "/",
      params: { orgId }
    });
  };

  const inviteUsers = async ({ emails: inviteEmails }: { emails: string }) => {
    const emailList = inviteEmails
      .split(/[,\n\r]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    await Promise.all(
      emailList.map((email) =>
        mutateAsync({
          inviteeEmails: [email],
          organizationId: orgId,
          organizationRoleSlug: "member"
        })
      )
    );

    await redirectToHome();
  };

  return (
    <div className="mx-auto flex w-full flex-col items-center justify-center">
      <UnstableCard className="mx-auto w-full max-w-md items-stretch gap-0 p-6">
        <UnstableCardHeader className="mb-4 gap-2">
          <UnstableCardTitle className="bg-linear-to-b from-white to-bunker-200 bg-clip-text text-[1.65rem] font-medium text-transparent">
            {t("signup.step5-invite-team")}
          </UnstableCardTitle>
        </UnstableCardHeader>
        <UnstableCardContent>
          <p className="mb-4 flex justify-center text-center text-sm text-muted">
            Enter up to 50 email addresses, separated by commas or new lines
          </p>
          <div className="w-full">
            <textarea
              className="h-20 w-full rounded-md border border-mineshaft-500 bg-mineshaft-900/70 px-2 py-1 text-sm text-bunker-300 outline-hidden ring-primary-800/70 placeholder:text-bunker-400 focus:ring-2"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
          </div>
          <div className="mt-4 w-full">
            <Button
              onClick={() => {
                if (serverDetails?.emailConfigured) {
                  inviteUsers({ emails });
                } else {
                  handlePopUpOpen("setUpEmail");
                }
              }}
              variant="project"
              size="lg"
              isFullWidth
            >
              {t("signup.step5-send-invites") ?? ""}
            </Button>
          </div>
          <EmailServiceSetupModal
            isOpen={popUp.setUpEmail?.isOpen}
            onOpenChange={(isOpen) => handlePopUpToggle("setUpEmail", isOpen)}
          />
          <div className="mt-6 w-full">
            <Button onClick={redirectToHome} variant="outline" size="lg" isFullWidth>
              {t("signup.step5-skip") ?? "Skip"}
            </Button>
          </div>
        </UnstableCardContent>
      </UnstableCard>
    </div>
  );
}
