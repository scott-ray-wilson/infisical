import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, TriangleAlert } from "lucide-react";

import { createNotification } from "@app/components/notifications";
import { Button } from "@app/components/v2";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertTitle,
  Input,
  Label,
  Skeleton
} from "@app/components/v3";
import { useDeleteMe, useGetMyDeletionImpact } from "@app/hooks/api";
import { AccountDeletionOrgImpactType } from "@app/hooks/api/users/types";
import { usePopUp } from "@app/hooks/usePopUp";

const CONFIRM_KEYWORD = "confirm";

export const DeleteAccountSection = () => {
  const navigate = useNavigate();

  const { popUp, handlePopUpOpen, handlePopUpClose, handlePopUpToggle } = usePopUp([
    "deleteAccount"
  ] as const);
  const [confirmInput, setConfirmInput] = useState("");

  const { mutateAsync: deleteUserMutateAsync, isPending } = useDeleteMe();
  const {
    data: impact,
    isPending: isImpactPending,
    isError: isImpactError
  } = useGetMyDeletionImpact({ enabled: popUp.deleteAccount.isOpen });

  const blockedOrgs =
    impact?.filter((el) => el.type === AccountDeletionOrgImpactType.BlockedLastAdmin) ?? [];
  const orgsToDelete =
    impact?.filter((el) => el.type === AccountDeletionOrgImpactType.OrgDeleted) ?? [];
  const isBlocked = blockedOrgs.length > 0;

  const handleDeleteAccountSubmit = async () => {
    await deleteUserMutateAsync();

    createNotification({
      text: "Successfully deleted account",
      type: "success"
    });

    navigate({ to: "/login" });
    handlePopUpClose("deleteAccount");
  };

  return (
    <div className="mb-6 rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4">
      <p className="mb-4 text-xl font-medium text-mineshaft-100">Danger Zone</p>
      <Button
        isLoading={isPending}
        colorSchema="danger"
        variant="outline_bg"
        type="submit"
        onClick={() => handlePopUpOpen("deleteAccount")}
      >
        Delete my account
      </Button>
      <AlertDialog
        open={popUp.deleteAccount.isOpen}
        onOpenChange={(isOpen) => {
          handlePopUpToggle("deleteAccount", isOpen);
          setConfirmInput("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <TriangleAlert />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove this account and all of its data. This action is not reversible, so
              please be careful.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isImpactPending && <Skeleton className="h-16 w-full" />}

          {isImpactError && (
            <Alert variant="danger">
              <TriangleAlert />
              <AlertTitle>Couldn&apos;t check your organizations</AlertTitle>
              <AlertDescription>
                <p>
                  The impact of deleting your account couldn&apos;t be verified. Please try again
                  later.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {isBlocked && (
            <Alert variant="danger">
              <TriangleAlert />
              <AlertTitle>
                You are the last admin of{" "}
                {blockedOrgs.length === 1
                  ? "an organization"
                  : `${blockedOrgs.length} organizations`}
              </AlertTitle>
              <AlertDescription>
                <p>
                  Promote another admin or delete{" "}
                  {blockedOrgs.length === 1 ? "this organization" : "these organizations"} before
                  deleting your account:
                </p>
                <ul className="list-disc pl-4">
                  {blockedOrgs.map((org) => (
                    <li key={org.orgId}>
                      <Link
                        to="/organizations/$orgId/access-management"
                        params={{ orgId: org.orgId }}
                        className="underline underline-offset-2"
                      >
                        {org.orgName}
                      </Link>{" "}
                      ({org.otherMemberCount} other{" "}
                      {org.otherMemberCount === 1 ? "member" : "members"})
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {orgsToDelete.length > 0 && (
            <Alert variant="warning">
              <Building2 />
              <AlertTitle>
                {orgsToDelete.length === 1
                  ? "1 organization will be deleted with your account"
                  : `${orgsToDelete.length} organizations will be deleted with your account`}
              </AlertTitle>
              <AlertDescription>
                <p>
                  You are the only member of{" "}
                  {orgsToDelete.length === 1
                    ? "this organization; it"
                    : "these organizations; they"}{" "}
                  will be permanently deleted, including all projects and secrets:
                </p>
                <ul className="list-disc pl-4">
                  {orgsToDelete.map((org) => (
                    <li key={org.orgId}>
                      <span className="font-medium">{org.orgName}</span>
                      {org.identityCount > 0 && (
                        <>
                          {" "}
                          &middot; {org.identityCount} machine{" "}
                          {org.identityCount === 1 ? "identity" : "identities"} will stop working
                        </>
                      )}
                      {org.subscriptionToCancel && (
                        <> &middot; its paid subscription will be cancelled</>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-account-confirm">
              Type <span className="font-bold">{CONFIRM_KEYWORD}</span> to confirm
            </Label>
            <Input
              id="delete-account-confirm"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              autoComplete="off"
              placeholder={`Type ${CONFIRM_KEYWORD} here`}
              disabled={isBlocked}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              isDisabled={
                isImpactPending ||
                isImpactError ||
                isBlocked ||
                confirmInput !== CONFIRM_KEYWORD ||
                isPending
              }
              isPending={isPending}
              onClick={handleDeleteAccountSubmit}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
