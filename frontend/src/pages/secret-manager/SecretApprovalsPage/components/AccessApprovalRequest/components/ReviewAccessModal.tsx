import { ReactNode, useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BanIcon,
  CheckIcon,
  HourglassIcon,
  InfoIcon,
  SquarePenIcon,
  TriangleAlertIcon,
  UserIcon,
  UserXIcon
} from "lucide-react";
import ms from "ms";
import picomatch from "picomatch";
import { twMerge } from "tailwind-merge";

import { createNotification } from "@app/components/notifications";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Badge,
  Button,
  Checkbox,
  Detail,
  DetailLabel,
  DetailValue,
  Field,
  FieldLabel,
  IconButton,
  Input,
  Label,
  ProjectIcon,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TextArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import {
  ProjectPermissionActions,
  ProjectPermissionMemberActions,
  ProjectPermissionSub,
  useProject,
  useProjectPermission,
  useUser
} from "@app/context";
import { usePopUp } from "@app/hooks";
import {
  useListWorkspaceGroups,
  useReviewAccessRequest,
  useRevokeAccessRequest
} from "@app/hooks/api";
import {
  Approver,
  ApproverType,
  TAccessApprovalPolicy,
  TAccessApprovalRequest
} from "@app/hooks/api/accessApproval/types";
import { EnforcementLevel } from "@app/hooks/api/policies/enums";
import { ApprovalStatus, TWorkspaceUser } from "@app/hooks/api/types";
import { groupBy } from "@app/lib/fn/array";
import {
  canModifyByGrantConditions,
  getMemberAssignPrivilegesConditions
} from "@app/lib/fn/permission";
import { EditAccessRequestModal } from "@app/pages/secret-manager/SecretApprovalsPage/components/AccessApprovalRequest/components/EditAccessRequestModal";

const getReviewedStatusSymbol = (status?: ApprovalStatus, isOrgMembershipActive?: boolean) => {
  if (status === ApprovalStatus.APPROVED)
    return (
      <Badge variant="success">
        <CheckIcon />
      </Badge>
    );
  if (status === ApprovalStatus.REJECTED)
    return (
      <Badge variant="danger">
        <BanIcon />
      </Badge>
    );

  if (!isOrgMembershipActive) {
    return (
      // Can't do a tooltip here because nested tooltips doesn't work properly as of yet.
      // TODO(daniel): Fix nested tooltips in the future.

      <Badge variant="neutral">
        <UserXIcon />
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <HourglassIcon />
    </Badge>
  );
};

export const ReviewAccessRequestModal = ({
  isOpen,
  onOpenChange,
  request,
  projectSlug,
  canBypass,
  policies = [],
  members = [],
  onUpdate
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: TAccessApprovalRequest & {
    user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
    isRequestedByCurrentUser: boolean;
    isSelfApproveAllowed: boolean;
    isApprover: boolean;
  };
  projectSlug: string;
  canBypass: boolean;
  policies: TAccessApprovalPolicy[];
  members: TWorkspaceUser[];
  onUpdate: (request: TAccessApprovalRequest) => void;
}) => {
  const [isLoading, setIsLoading] = useState<"approved" | "rejected" | "revoked" | null>(null);
  const [bypassApproval, setBypassApproval] = useState(false);

  const [bypassReason, setBypassReason] = useState("");
  const [revokeConfirmText, setRevokeConfirmText] = useState("");
  const { currentProject } = useProject();
  const { data: groupMemberships = [] } = useListWorkspaceGroups(currentProject?.id || "");
  const { user } = useUser();
  const { permission } = useProjectPermission();

  const { popUp, handlePopUpToggle, handlePopUpOpen } = usePopUp([
    "editRequest",
    "revokeConfirm"
  ] as const);

  const isSoftEnforcement = request.policy.enforcementLevel === EnforcementLevel.Soft;

  const assignPrivilegesConditions = useMemo(
    () => getMemberAssignPrivilegesConditions(permission),
    [permission]
  );

  const canRevokeAccess = useMemo(() => {
    if (request.isApprover) return true;

    const hasBasePermission = permission.can(
      ProjectPermissionMemberActions.AssignAdditionalPrivileges,
      ProjectPermissionSub.Member
    );
    if (!hasBasePermission) return false;

    const targetEmail = request.user?.email;
    if (!targetEmail) return false;

    return canModifyByGrantConditions({
      targetValue: targetEmail,
      allowed: assignPrivilegesConditions?.emails,
      forbidden: assignPrivilegesConditions?.forbiddenEmails,
      isMatch: (value, pattern) => picomatch.isMatch(value, pattern, { nocase: true })
    });
  }, [permission, assignPrivilegesConditions, request.user?.email, request.isApprover]);

  const accessDetails = {
    env:
      currentProject?.environments.find((env) => env.slug === request.environmentName)?.name ??
      request.environmentName,
    // secret path will be inside $glob operator
    secretPath: request.policy.secretPath,
    read: request.permissions?.some(({ action }) => action.includes(ProjectPermissionActions.Read)),
    edit: request.permissions?.some(({ action }) => action.includes(ProjectPermissionActions.Edit)),
    create: request.permissions?.some(({ action }) =>
      action.includes(ProjectPermissionActions.Create)
    ),
    delete: request.permissions?.some(({ action }) =>
      action.includes(ProjectPermissionActions.Delete)
    ),

    temporaryAccess: {
      isTemporary: request.isTemporary,
      temporaryRange: request.temporaryRange
    }
  };

  // Collapse the details grid to a single column when the environment name or secret
  // path is long enough that two side-by-side columns would feel cramped.
  const DETAILS_COLLAPSE_THRESHOLD = 30;
  const shouldCollapseDetails =
    (accessDetails.env?.length ?? 0) > DETAILS_COLLAPSE_THRESHOLD ||
    (accessDetails.secretPath?.length ?? 0) > DETAILS_COLLAPSE_THRESHOLD;

  const requestedAccess = useMemo(() => {
    const access: string[] = [];
    if (accessDetails.read) access.push("Read");
    if (accessDetails.edit) access.push("Edit");
    if (accessDetails.create) access.push("Create");
    if (accessDetails.delete) access.push("Delete");

    return access.join(", ");
  }, [accessDetails]);

  const getAccessLabel = () => {
    if (!accessDetails.temporaryAccess.isTemporary || !accessDetails.temporaryAccess.temporaryRange)
      return "Permanent";

    return `Valid for ${ms(ms(accessDetails.temporaryAccess.temporaryRange), {
      long: true
    })} after approval`;
  };

  const reviewAccessRequest = useReviewAccessRequest();
  const revokeAccessRequest = useRevokeAccessRequest();

  const handleReview = useCallback(
    async (status: "approved" | "rejected") => {
      if (bypassApproval && bypassReason.length < 10) {
        createNotification({
          title: "Failed to bypass approval",
          text: "Reason must be 10 characters or longer",
          type: "error"
        });
        return;
      }

      setIsLoading(status);
      try {
        await reviewAccessRequest.mutateAsync({
          requestId: request.id,
          status,
          projectSlug,
          bypassReason: bypassApproval ? bypassReason : undefined
        });

        createNotification({
          title: `Request ${status}`,
          text: `The request has been ${status}`,
          type: status === "approved" ? "success" : "info"
        });
      } catch {
        setIsLoading(null);
        return;
      }

      setIsLoading(null);
      onOpenChange(false);
    },
    [bypassApproval, bypassReason, reviewAccessRequest, request, onOpenChange]
  );

  const handleRevoke = useCallback(async () => {
    setIsLoading("revoked");
    try {
      await revokeAccessRequest.mutateAsync({
        requestId: request.id,
        projectSlug
      });
      createNotification({
        title: "Access revoked",
        text: "The access has been successfully revoked",
        type: "success"
      });
    } catch {
      setIsLoading(null);
      return;
    }
    setIsLoading(null);
    onOpenChange(false);
  }, [revokeAccessRequest, request, projectSlug, onOpenChange]);

  const approverSequence = useMemo(() => {
    const policy = policies.find((el) => el.id === request.policy.id);
    const reviewesGroupById = groupBy(request.reviewers, (i) => i.userId);
    const membersGroupById = groupBy(members, (i) => i.user.id);
    const projectGroupsGroupById = groupBy(groupMemberships, (i) => i.group.id);
    const approversBySequence = policy?.approvers?.reduce(
      (acc, curr) => {
        if (acc.length && acc[acc.length - 1].sequence === curr.sequence) {
          acc[acc.length - 1][curr.type]?.push(curr);

          return acc;
        }

        const approvals = curr.approvalsRequired || policy.approvals;
        const sequence = curr.sequence || 1;

        acc.push(
          curr.type === ApproverType.User
            ? { user: [curr], group: [], sequence, approvals }
            : { group: [curr], user: [], sequence, approvals }
        );

        return acc;
      },
      [] as {
        user: Approver[];
        group: Approver[];
        sequence?: number;
        approvals?: number;
      }[]
    );

    const approvers = approversBySequence?.map((approverChain) => {
      const reviewers = request.policy.approvers
        .filter((el) => (el.sequence || 1) === approverChain.sequence)
        .map((el) => ({
          ...el,
          status: reviewesGroupById?.[el.userId]?.[0]?.status
        }));
      const hasApproved =
        reviewers.filter((el) => el.status === "approved").length >=
        (approverChain?.approvals || 1);

      const hasRejected = reviewers.filter((el) => el.status === ApprovalStatus.REJECTED).length;
      return { ...approverChain, reviewers, hasApproved, hasRejected };
    });
    const currentSequenceApprover = approvers?.find((el) => !el.hasApproved);
    const currentSequence =
      currentSequenceApprover?.sequence ?? (approvers?.[approvers.length - 1]?.sequence ?? 1) + 1;
    const isMyReviewInThisSequence = currentSequenceApprover?.reviewers.find(
      (i) => i.userId === user.id
    );

    return {
      approvers,
      membersGroupById,
      projectGroupsGroupById,
      currentSequence,
      isMyReviewInThisSequence
    };
  }, [request, policies]);

  const hasRejected = request.status === ApprovalStatus.REJECTED;
  const hasApproved = request.status === ApprovalStatus.APPROVED;
  const hasRevoked = request.status === ApprovalStatus.REVOKED;
  const hasExpired =
    !hasApproved &&
    !hasRejected &&
    !hasRevoked &&
    request.expiresAt &&
    new Date(request.expiresAt) < new Date();
  const isReviewedByMe = request.reviewers.find((i) => i.userId === user.id);

  const shouldBlockRequestActions =
    hasRejected ||
    hasApproved ||
    hasRevoked ||
    hasExpired ||
    isReviewedByMe ||
    (!approverSequence?.isMyReviewInThisSequence && !canBypass);

  const renderCompletedMessages = () => {
    if (hasExpired) return "This request has expired.";
    if (hasRejected) return "This request has been rejected.";
    if (hasRevoked) {
      const revokedByEmail = request.revokedByUser?.email;
      return `This access has been revoked${revokedByEmail ? ` by ${revokedByEmail}` : ""}.`;
    }
    if (hasApproved) return "This request has been approved.";
    if (isReviewedByMe) return "You have reviewed this request.";
    return "You are not the reviewer in this step.";
  };

  const completedMessageVariant = hasRejected || hasRevoked || hasExpired ? "danger" : "info";

  // users can always reject (cancel) their own request
  const isRejectionDisabled = request.isRequestedByCurrentUser
    ? false
    : !(request.isApprover && request.isSelfApproveAllowed) && !bypassApproval;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="flex h-full flex-col gap-y-0 overflow-hidden sm:max-w-2xl">
          <SheetHeader className="border-b">
            <SheetTitle>Review Request</SheetTitle>
            <SheetDescription>Review the request and approve or deny access.</SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 thin-scrollbar flex-1 flex-col overflow-y-auto p-4">
            <Alert variant="project" className="mb-4">
              <ProjectIcon />
              <AlertDescription>
                <p>
                  {request.user &&
                  (request.user.firstName || request.user.lastName) &&
                  request.user.email ? (
                    <span className="font-medium text-foreground">
                      {request.user?.firstName} {request.user?.lastName} ({request.user?.email})
                    </span>
                  ) : (
                    <span>A user</span>
                  )}{" "}
                  is requesting access to the following resource:
                </p>
              </AlertDescription>
            </Alert>
            <div className="">
              <div className="mt-4 mb-2 text-mineshaft-200">
                <div
                  className={twMerge(
                    "grid gap-x-8 gap-y-4",
                    shouldCollapseDetails ? "grid-cols-1" : "grid-cols-2"
                  )}
                >
                  <Detail>
                    <DetailLabel>Environment</DetailLabel>
                    <DetailValue>{accessDetails.env}</DetailValue>
                  </Detail>
                  <Detail>
                    <DetailLabel>Secret Path</DetailLabel>
                    <DetailValue className={shouldCollapseDetails ? undefined : "truncate"}>
                      {accessDetails.secretPath}
                    </DetailValue>
                  </Detail>
                  <Detail>
                    <DetailLabel>Access Duration</DetailLabel>
                    <DetailValue>
                      <div className="flex items-center gap-1">
                        {getAccessLabel()}
                        {request.isApprover && request.status === ApprovalStatus.PENDING && (
                          <>
                            <EditAccessRequestModal
                              isOpen={popUp.editRequest.isOpen}
                              onOpenChange={(open) => handlePopUpToggle("editRequest", open)}
                              accessRequest={request}
                              onComplete={onUpdate}
                              projectSlug={projectSlug}
                            />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <IconButton
                                  onClick={() => handlePopUpOpen("editRequest")}
                                  variant="ghost"
                                  size="xs"
                                  tabIndex={-1}
                                  aria-label="Edit access duration"
                                  className="-my-1"
                                >
                                  <SquarePenIcon />
                                </IconButton>
                              </TooltipTrigger>
                              <TooltipContent>Edit Access Duration</TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </DetailValue>
                  </Detail>
                  <Detail>
                    <DetailLabel>Permission</DetailLabel>
                    <DetailValue>{requestedAccess}</DetailValue>
                  </Detail>
                  {request.note && (
                    <Detail className="col-span-full">
                      <DetailLabel>Note</DetailLabel>
                      <DetailValue>{request.note}</DetailValue>
                    </Detail>
                  )}
                  {request.expiresAt &&
                    request.status === ApprovalStatus.PENDING &&
                    new Date(request.expiresAt) > new Date() && (
                      <Detail>
                        <DetailLabel>Request Expires</DetailLabel>
                        <DetailValue>
                          <span>
                            In{" "}
                            {ms(new Date(request.expiresAt).getTime() - Date.now(), {
                              long: true
                            })}
                          </span>
                        </DetailValue>
                      </Detail>
                    )}
                  {hasExpired && request.expiresAt && (
                    <Detail>
                      <DetailLabel>Expired At</DetailLabel>
                      <DetailValue>
                        <span className="text-danger">
                          {format(new Date(request.expiresAt), "MMM d, yyyy h:mm aa")}
                        </span>
                      </DetailValue>
                    </Detail>
                  )}
                  {hasRejected && (
                    <Detail>
                      <DetailLabel>Rejected At</DetailLabel>
                      <DetailValue>
                        <span className="text-danger">
                          {format(new Date(request.updatedAt), "MMM d, yyyy h:mm aa")}
                        </span>
                      </DetailValue>
                    </Detail>
                  )}
                  {(hasApproved || hasRevoked) && (request.approvedAt || hasApproved) && (
                    <Detail>
                      <DetailLabel>Approved At</DetailLabel>
                      <DetailValue>
                        <span className="text-success">
                          {format(
                            new Date(request.approvedAt || request.updatedAt),
                            "MMM d, yyyy h:mm aa"
                          )}
                        </span>
                      </DetailValue>
                    </Detail>
                  )}
                  {hasRevoked && request.revokedAt && (
                    <Detail>
                      <DetailLabel>Revoked At</DetailLabel>
                      <DetailValue>
                        <span className="text-danger">
                          {format(new Date(request.revokedAt), "MMM d, yyyy h:mm aa")}
                        </span>
                      </DetailValue>
                    </Detail>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-b-2 border-mineshaft-500 py-2">
                <span>Approvers</span>
                {approverSequence.isMyReviewInThisSequence &&
                  request.status === ApprovalStatus.PENDING &&
                  !hasExpired && <Badge variant="warning">Awaiting Your Review</Badge>}
              </div>
              <div className="rounded-sm py-2">
                {approverSequence?.approvers &&
                  approverSequence.approvers.map((approver, index) => {
                    const isInactive =
                      approverSequence?.currentSequence <
                      (approver.sequence ?? approverSequence.approvers!.length);

                    const isPending = approverSequence?.currentSequence === approver.sequence;

                    let StepComponent: ReactNode;
                    let BadgeComponent: ReactNode = null;
                    if (approver.hasRejected) {
                      StepComponent = (
                        <Badge isSquare variant="danger">
                          <BanIcon />
                        </Badge>
                      );
                      BadgeComponent = <Badge variant="danger">Rejected</Badge>;
                    } else if (approver.hasApproved) {
                      StepComponent = (
                        <Badge isSquare variant="success">
                          <CheckIcon />
                        </Badge>
                      );
                      BadgeComponent = <Badge variant="success">Approved</Badge>;
                    } else if (isPending && !hasExpired) {
                      StepComponent = (
                        <Badge isSquare variant="warning">
                          <HourglassIcon />
                        </Badge>
                      );
                      BadgeComponent = <Badge variant="warning">Pending</Badge>;
                    } else {
                      StepComponent = (
                        <Badge isSquare variant="neutral">
                          <span>{index + 1}</span>
                        </Badge>
                      );
                    }

                    return (
                      <div
                        key={`approval-list-${index + 1}`}
                        className={twMerge("flex", isInactive && "opacity-50")}
                      >
                        {approverSequence.approvers!.length > 1 && (
                          <div className="flex w-12 flex-col items-center gap-2 pr-4">
                            <div
                              className={twMerge(
                                "grow border-mineshaft-600",
                                index !== 0 && "border-r"
                              )}
                            />
                            {StepComponent}
                            <div
                              className={twMerge(
                                "grow border-mineshaft-600",
                                index < approverSequence.approvers!.length - 1 && "border-r"
                              )}
                            />
                          </div>
                        )}
                        <div className="grid flex-1 grid-cols-5 border-b border-mineshaft-600 p-4">
                          <Detail className="col-span-2">
                            <DetailLabel>
                              <UserIcon className="size-3" />
                              Users
                            </DetailLabel>
                            <DetailValue>
                              {Boolean(approver.user.length) && (
                                <div className="flex flex-row flex-wrap gap-2">
                                  {approver?.user?.map((el, idx) => {
                                    const member = approverSequence?.membersGroupById?.[el.id]?.[0];

                                    if (!member) {
                                      const policyApprover = request.policy.approvers.find(
                                        (a) => a.userId === el.id
                                      );
                                      return (
                                        <div className="flex items-center" key={el.id}>
                                          <span className="flex items-center gap-2 opacity-40">
                                            {policyApprover?.email ||
                                              policyApprover?.username ||
                                              el.id}
                                            <span className="text-xs">
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Badge variant="neutral">
                                                    <BanIcon />
                                                    Removed
                                                  </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  This user has been removed from the project.
                                                </TooltipContent>
                                              </Tooltip>
                                            </span>
                                          </span>
                                          {idx < approver.user.length - 1 && ","}
                                        </div>
                                      );
                                    }

                                    return member.user.isOrgMembershipActive ? (
                                      <div className="flex items-center" key={member.user.id}>
                                        <span>{member.user.username}</span>
                                        {idx < approver.user.length - 1 && ","}
                                      </div>
                                    ) : (
                                      <div className="flex items-center" key={member.user.id}>
                                        <span className="flex items-center gap-2 opacity-40">
                                          {member.user.username}
                                          <span className="text-xs">
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Badge variant="neutral">
                                                  <BanIcon />
                                                  Inactive
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                This user has been deactivated and no longer has an
                                                active organization membership.
                                              </TooltipContent>
                                            </Tooltip>
                                          </span>
                                        </span>
                                        {idx < approver.user.length - 1 && ","}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </DetailValue>
                          </Detail>
                          <Detail className="col-span-2">
                            <DetailLabel>Groups</DetailLabel>
                            <DetailValue>
                              {approver?.group
                                ?.map(
                                  (el) =>
                                    approverSequence?.projectGroupsGroupById?.[el.id]?.[0]?.group
                                      ?.name
                                )
                                .join(", ")}
                            </DetailValue>
                          </Detail>
                          <Detail>
                            <DetailLabel>Approvals Required</DetailLabel>
                            <DetailValue>
                              <div className="flex items-center">
                                <span className="mr-2">{approver.approvals}</span>
                                {BadgeComponent && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>{BadgeComponent}</div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-lg">
                                      <div>
                                        <div className="mb-1 text-sm text-bunker-300">
                                          Reviewers
                                        </div>
                                        <div className="flex max-h-64 thin-scrollbar flex-col divide-y divide-mineshaft-500 overflow-y-auto rounded-sm">
                                          {approver.reviewers.map((el, idx) => (
                                            <div
                                              key={`reviewer-${idx + 1}`}
                                              className="flex items-center gap-2 px-2 py-2 text-sm"
                                            >
                                              <div
                                                className={twMerge(
                                                  "flex-1",
                                                  !el.isOrgMembershipActive && "opacity-40"
                                                )}
                                              >
                                                {el.username}
                                              </div>
                                              {getReviewedStatusSymbol(
                                                el?.status as ApprovalStatus,
                                                el.isOrgMembershipActive
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </DetailValue>
                          </Detail>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          <SheetFooter className="flex-col border-t">
            {shouldBlockRequestActions ? (
              <Alert variant={completedMessageVariant}>
                {completedMessageVariant === "danger" ? <TriangleAlertIcon /> : <InfoIcon />}
                <AlertTitle>{renderCompletedMessages()}</AlertTitle>
              </Alert>
            ) : (
              <>
                {isSoftEnforcement && request.isRequestedByCurrentUser && canBypass && (
                  <div className="mb-2 flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        onCheckedChange={(checked) => setBypassApproval(checked === true)}
                        isChecked={bypassApproval}
                        id="byPassApproval"
                        variant="warning"
                      />
                      <Label htmlFor="byPassApproval" className="text-xs font-normal text-warning">
                        Approve without waiting for requirements to be met (bypass policy
                        protection)
                      </Label>
                    </div>
                    {bypassApproval && (
                      <Field className="mt-2">
                        <FieldLabel htmlFor="bypassReason">
                          Reason for bypass
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TriangleAlertIcon className="text-warning" />
                            </TooltipTrigger>
                            <TooltipContent>Enter a reason for bypassing the policy</TooltipContent>
                          </Tooltip>
                        </FieldLabel>
                        <TextArea
                          id="bypassReason"
                          value={bypassReason}
                          onChange={(e) => setBypassReason(e.currentTarget.value)}
                          placeholder="Enter reason for bypass (min 10 chars)"
                        />
                      </Field>
                    )}
                  </div>
                )}
                <div className="space-x-2">
                  <Button
                    isPending={isLoading === "approved"}
                    isDisabled={
                      Boolean(isLoading) ||
                      (!(
                        request.isApprover &&
                        (!request.isRequestedByCurrentUser || request.isSelfApproveAllowed)
                      ) &&
                        !bypassApproval)
                    }
                    onClick={() => handleReview("approved")}
                    size="sm"
                    variant={!request.isApprover && isSoftEnforcement ? "danger" : "project"}
                  >
                    Approve Request
                  </Button>
                  <Button
                    isPending={isLoading === "rejected"}
                    isDisabled={!!isLoading || isRejectionDisabled}
                    onClick={() => handleReview("rejected")}
                    size="sm"
                    variant="danger"
                  >
                    Reject Request
                  </Button>
                </div>
              </>
            )}
            {hasApproved && canRevokeAccess && (
              <div>
                <Button
                  isDisabled={Boolean(isLoading)}
                  onClick={() => handlePopUpOpen("revokeConfirm")}
                  size="sm"
                  variant="danger"
                >
                  Revoke Access
                </Button>
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={popUp.revokeConfirm.isOpen}
        onOpenChange={(open) => {
          handlePopUpToggle("revokeConfirm", open);
          if (!open) setRevokeConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately remove the privilege granted by this access request. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="revoke-confirm">
              Type <span className="font-semibold text-foreground">confirm</span> to revoke
            </Label>
            <Input
              id="revoke-confirm"
              value={revokeConfirmText}
              onChange={(e) => setRevokeConfirmText(e.target.value)}
              placeholder="confirm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeConfirmText("")}>Cancel</AlertDialogCancel>
            <Button
              variant="danger"
              isPending={isLoading === "revoked"}
              isDisabled={revokeConfirmText !== "confirm" || isLoading === "revoked"}
              onClick={handleRevoke}
            >
              Revoke Access
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
