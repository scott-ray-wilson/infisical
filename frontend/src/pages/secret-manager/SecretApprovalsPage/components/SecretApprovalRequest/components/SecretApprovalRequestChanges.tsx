/* eslint-disable no-nested-ternary */
import { Fragment, ReactNode, useState } from "react";
import { format } from "date-fns";
import {
  BanIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  GitMergeIcon,
  GitPullRequestIcon,
  HourglassIcon,
  InfoIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  UserXIcon,
  XIcon
} from "lucide-react";

import { createNotification } from "@app/components/notifications";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Detail,
  DetailGroup,
  DetailLabel,
  DetailValue,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldLabel,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  TextArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import { cn } from "@app/components/v3/utils";
import { useProject, useUser } from "@app/context";
import {
  useGetSecretApprovalRequestDetails,
  useGetSecretImports,
  usePerformSecretApprovalRequestMerge,
  useUpdateSecretApprovalReviewStatus
} from "@app/hooks/api";
import { ApprovalStatus, CommitType } from "@app/hooks/api/types";
import { formatReservedPaths, parsePathFromReplicatedPath } from "@app/lib/fn/string";

import { SecretApprovalRequestAction } from "./SecretApprovalRequestAction";
import { SecretApprovalRequestChangeItem } from "./SecretApprovalRequestChangeItem";

export const generateCommitText = (commits: { op: CommitType }[] = [], isReplicated = false) => {
  if (isReplicated) {
    return <span>{commits.length} secret pending import</span>;
  }

  const score: Record<string, number> = {};
  commits.forEach(({ op }) => {
    score[op] = (score?.[op] || 0) + 1;
  });
  const text: ReactNode[] = [];
  if (score[CommitType.CREATE])
    text.push(
      <span key="created-commit">
        {score[CommitType.CREATE]} Secret{score[CommitType.CREATE] !== 1 && "s"}
        <span className="text-green-600"> Created</span>
      </span>
    );
  if (score[CommitType.UPDATE])
    text.push(
      <span key="updated-commit">
        {Boolean(text.length) && ", "}
        {score[CommitType.UPDATE]} Secret{score[CommitType.UPDATE] !== 1 && "s"}
        <span className="text-yellow-600"> Updated</span>
      </span>
    );
  if (score[CommitType.DELETE])
    text.push(
      <span key="deleted-commit">
        {Boolean(text.length) && " and "}
        {score[CommitType.DELETE]} Secret{score[CommitType.DELETE] !== 1 && "s"}
        <span className="text-red-600"> Deleted</span>
      </span>
    );
  return text;
};

const getReviewStatusBadge = (status?: ApprovalStatus) => {
  if (status === ApprovalStatus.APPROVED)
    return (
      <Badge variant="success">
        <CheckIcon />
        Approved
      </Badge>
    );
  if (status === ApprovalStatus.REJECTED)
    return (
      <Badge variant="danger">
        <BanIcon />
        Rejected
      </Badge>
    );
  return (
    <Badge variant="warning">
      <HourglassIcon />
      Pending
    </Badge>
  );
};

type Props = {
  approvalRequestId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export const SecretApprovalRequestChanges = ({
  approvalRequestId,
  isOpen,
  onOpenChange
}: Props) => {
  const { user: userSession } = useUser();
  const { currentProject, projectId } = useProject();
  const [comment, setComment] = useState("");
  const [willMerge, setWillMerge] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: secretApprovalRequestDetails, isPending: isLoading } =
    useGetSecretApprovalRequestDetails({
      id: approvalRequestId,
      options: { enabled: isOpen }
    });

  const approvalSecretPath = parsePathFromReplicatedPath(
    secretApprovalRequestDetails?.secretPath || ""
  );
  const { data: secretImports } = useGetSecretImports({
    environment: secretApprovalRequestDetails?.environment || "",
    projectId,
    path: approvalSecretPath,
    options: { enabled: isOpen && Boolean(secretApprovalRequestDetails?.environment) }
  });

  const replicatedImport = secretApprovalRequestDetails?.isReplicated
    ? secretImports?.find(
        (el) => secretApprovalRequestDetails?.secretPath?.includes(el.id) && el.isReplication
      )
    : undefined;

  const {
    mutateAsync: updateSecretApprovalRequestStatus,
    isPending: isUpdatingRequestStatus,
    variables
  } = useUpdateSecretApprovalReviewStatus();

  const { mutateAsync: performSecretApprovalMerge } = usePerformSecretApprovalRequestMerge();

  const handleReview = async (status: ApprovalStatus) => {
    if (!secretApprovalRequestDetails) return;
    await updateSecretApprovalRequestStatus({
      id: approvalRequestId,
      status,
      comment,
      projectId
    });
    createNotification({
      type: "success",
      text: `Successfully ${status} the request`
    });
    setComment("");
    setReviewOpen(false);
  };

  const handleApproveAndMerge = async () => {
    if (!secretApprovalRequestDetails) return;
    try {
      setWillMerge(true);
      await handleReview(ApprovalStatus.APPROVED);
      await performSecretApprovalMerge({ projectId, id: secretApprovalRequestDetails.id });
    } catch {
      // Approval or merge failed, error already shown via mutation
    } finally {
      setWillMerge(false);
    }
  };

  const reviewedUsers = secretApprovalRequestDetails?.reviewers?.reduce<
    Record<
      string,
      { status: ApprovalStatus; comment: string; isOrgMembershipActive: boolean; createdAt: Date }
    >
  >(
    (prev, curr) => ({
      ...prev,
      [curr.userId]: {
        status: curr.status,
        comment: curr.comment,
        isOrgMembershipActive: curr.isOrgMembershipActive,
        createdAt: curr.createdAt
      }
    }),
    {}
  );

  const isCommitter = secretApprovalRequestDetails?.committerUserId === userSession.id;
  const shouldBlockSelfReview =
    secretApprovalRequestDetails?.policy?.allowedSelfApprovals === false && isCommitter;
  const canApprove = secretApprovalRequestDetails?.policy?.approvers?.some(
    ({ userId }) => userId === userSession.id
  );
  const isBypasser =
    !secretApprovalRequestDetails?.policy?.bypassers ||
    !secretApprovalRequestDetails.policy.bypassers.length ||
    secretApprovalRequestDetails.policy.bypassers.some(({ userId }) => userId === userSession.id);

  const hasMerged = secretApprovalRequestDetails?.hasMerged;
  const approvalsRequired = secretApprovalRequestDetails?.policy?.approvals ?? 0;
  const isMergable =
    approvalsRequired <=
    (secretApprovalRequestDetails?.policy?.approvers?.filter(
      ({ userId }) => reviewedUsers?.[userId]?.status === ApprovalStatus.APPROVED
    ).length ?? 0);
  const isMergableUponApprove =
    approvalsRequired <=
    (secretApprovalRequestDetails?.policy?.approvers?.filter(
      ({ userId }) =>
        userId === userSession.id || reviewedUsers?.[userId]?.status === ApprovalStatus.APPROVED
    ).length ?? 0);

  const isApproving = variables?.status === ApprovalStatus.APPROVED && isUpdatingRequestStatus;
  const isRejecting = variables?.status === ApprovalStatus.REJECTED && isUpdatingRequestStatus;
  const actionInFlight = isUpdatingRequestStatus || willMerge;

  const canReview = Boolean(
    secretApprovalRequestDetails &&
      !hasMerged &&
      secretApprovalRequestDetails.status === "open" &&
      !shouldBlockSelfReview &&
      canApprove
  );

  const committerUser = secretApprovalRequestDetails?.committerUser;
  const environmentName = secretApprovalRequestDetails
    ? (currentProject?.environments.find(
        (env) => env.slug === secretApprovalRequestDetails.environment
      )?.name ?? secretApprovalRequestDetails.environment)
    : "";

  // Build the reviewer list: required approvers first, then any extra reviewers.
  const reviewerRows = secretApprovalRequestDetails
    ? [
        ...secretApprovalRequestDetails.policy.approvers
          .filter((approver) => !(shouldBlockSelfReview && approver.userId === userSession.id))
          .map((approver) => ({
            userId: approver.userId,
            firstName: approver.firstName,
            lastName: approver.lastName,
            email: approver.email,
            isOrgMembershipActive: approver.isOrgMembershipActive,
            isRequired: true
          })),
        ...secretApprovalRequestDetails.reviewers
          .filter(
            (reviewer) =>
              !secretApprovalRequestDetails.policy.approvers.some(
                ({ userId }) => userId === reviewer.userId
              )
          )
          .map((reviewer) => ({
            userId: reviewer.userId,
            firstName: reviewer.firstName,
            lastName: reviewer.lastName,
            email: reviewer.email,
            isOrgMembershipActive: reviewer.isOrgMembershipActive,
            isRequired: false
          }))
      ]
    : [];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-4/5 flex-col gap-0 overflow-hidden sm:max-w-none">
        <SheetHeader className="border-b">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 flex-col gap-1.5">
              <SheetTitle className="flex items-center gap-2">
                {secretApprovalRequestDetails ? (
                  <>
                    <span>
                      {generateCommitText(
                        secretApprovalRequestDetails.commits,
                        secretApprovalRequestDetails.isReplicated
                      )}
                    </span>
                    {hasMerged ? (
                      <Badge variant="success">
                        <GitMergeIcon />
                        Merged
                      </Badge>
                    ) : secretApprovalRequestDetails.status === "close" ? (
                      <Badge variant="danger">
                        <XIcon />
                        Closed
                      </Badge>
                    ) : (
                      <Badge variant="info">
                        <GitPullRequestIcon />
                        Open
                      </Badge>
                    )}
                  </>
                ) : (
                  "Change Request"
                )}
              </SheetTitle>
              {secretApprovalRequestDetails && (
                <SheetDescription>
                  Opened by{" "}
                  {committerUser ? (
                    <>
                      {committerUser.firstName} ({committerUser.email})
                    </>
                  ) : (
                    "Deleted User"
                  )}
                </SheetDescription>
              )}
            </div>
            {canReview && (
              <Popover open={reviewOpen} onOpenChange={setReviewOpen}>
                <PopoverTrigger asChild>
                  <Button variant="project" size="sm" className="shrink-0">
                    <ClipboardCheckIcon />
                    Review
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="flex w-96 flex-col gap-3">
                  <span className="text-sm font-medium text-foreground">Finish your review</span>
                  <Field>
                    <FieldLabel htmlFor="review-comment">Comment (optional)</FieldLabel>
                    <TextArea
                      id="review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Leave a comment..."
                      rows={3}
                    />
                  </Field>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="project"
                      size="sm"
                      isFullWidth
                      isPending={isApproving && !willMerge}
                      isDisabled={actionInFlight}
                      onClick={() => handleReview(ApprovalStatus.APPROVED)}
                    >
                      <CheckIcon />
                      Approve
                    </Button>
                    {isMergableUponApprove && (
                      <Button
                        variant="project"
                        size="sm"
                        isFullWidth
                        isPending={willMerge}
                        isDisabled={actionInFlight}
                        onClick={handleApproveAndMerge}
                      >
                        <GitMergeIcon />
                        Approve & Merge
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      size="sm"
                      isFullWidth
                      isPending={isRejecting}
                      isDisabled={actionInFlight}
                      onClick={() => handleReview(ApprovalStatus.REJECTED)}
                    >
                      <BanIcon />
                      Reject
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex thin-scrollbar flex-1 flex-col gap-4 overflow-y-auto p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !secretApprovalRequestDetails ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Failed to load change request</EmptyTitle>
                <EmptyDescription>Please close this panel and try again.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex thin-scrollbar w-96 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border p-4">
              <DetailGroup>
                <Detail>
                  <DetailLabel>Environment</DetailLabel>
                  <DetailValue>{environmentName}</DetailValue>
                </Detail>
                <Detail>
                  <DetailLabel>Secret Path</DetailLabel>
                  <DetailValue className="truncate">
                    {secretApprovalRequestDetails.isReplicated
                      ? approvalSecretPath
                      : formatReservedPaths(secretApprovalRequestDetails.secretPath)}
                  </DetailValue>
                </Detail>
              </DetailGroup>

              {reviewerRows.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-foreground">Reviewers</span>
                  <ItemGroup className="gap-0 rounded-lg border border-border bg-container">
                    {reviewerRows.map((row, index) => {
                      const reviewer = reviewedUsers?.[row.userId];
                      const displayName =
                        [row.firstName, row.lastName].filter(Boolean).join(" ") || row.email;
                      return (
                        <Fragment key={`reviewer-${row.userId}`}>
                          {index > 0 && <ItemSeparator className="m-0" />}
                          <Item className="rounded-none border-0">
                            <ItemContent className="min-w-0">
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 text-sm",
                                  !row.isOrgMembershipActive && "opacity-50"
                                )}
                              >
                                <span className="truncate text-foreground">{displayName}</span>
                                {row.isRequired && <span className="text-danger">*</span>}
                                {!row.isOrgMembershipActive && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <UserXIcon className="size-3.5 shrink-0 text-muted" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      This user has been deactivated and no longer has an active
                                      organization membership.
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </ItemContent>
                            <ItemActions>
                              {reviewer?.comment && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <MessageSquareIcon className="size-3.5 text-muted" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm break-words">
                                    {reviewer.comment}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {reviewer ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>{getReviewStatusBadge(reviewer.status)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Reviewed{" "}
                                    {format(new Date(reviewer.createdAt), "MMM d, yyyy h:mm aa")}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                getReviewStatusBadge(undefined)
                              )}
                            </ItemActions>
                          </Item>
                        </Fragment>
                      );
                    })}
                  </ItemGroup>
                </div>
              )}
            </div>

            <div className="flex min-h-0 thin-scrollbar flex-1 flex-col gap-4 overflow-y-auto p-4">
              <Alert variant="info">
                <InfoIcon />
                <AlertDescription>
                  {secretApprovalRequestDetails.isReplicated
                    ? `A secret import in this environment has pending changes from its source at ${
                        replicatedImport?.importEnv?.slug ?? ""
                      } ${replicatedImport?.importPath ?? ""}. Approving will add them to that import.`
                    : "These secret changes are pending approval. Approving will apply them to the target environment and path."}
                </AlertDescription>
              </Alert>
              <div>
                <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                  <KeyRoundIcon className="size-4 text-accent" />
                  <span className="flex-1 text-xs font-semibold tracking-wider text-accent uppercase">
                    Secrets
                  </span>
                  <Badge variant="neutral">{secretApprovalRequestDetails.commits.length}</Badge>
                </div>
                <div className="space-y-2">
                  {secretApprovalRequestDetails.commits.map(
                    ({ op, secretVersion, secret, ...newVersion }, index) => (
                      <SecretApprovalRequestChangeItem
                        op={op}
                        conflicts={secretApprovalRequestDetails.conflicts}
                        hasMerged={hasMerged}
                        secretVersion={secretVersion}
                        presentSecretVersionNumber={secret?.version || 0}
                        newVersion={newVersion}
                        key={`${op}-${index + 1}-${secretVersion?.id}`}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {secretApprovalRequestDetails && (
          <SheetFooter className="flex-col border-t">
            <SecretApprovalRequestAction
              canApprove={canApprove}
              isCommitter={isCommitter}
              isBypasser={isBypasser}
              approvalRequestId={secretApprovalRequestDetails.id}
              hasMerged={hasMerged}
              approvals={secretApprovalRequestDetails.policy.approvals || 0}
              status={secretApprovalRequestDetails.status}
              isMergable={isMergable}
              statusChangeByEmail={secretApprovalRequestDetails.statusChangedByUser?.email}
              enforcementLevel={secretApprovalRequestDetails.policy.enforcementLevel}
            />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};
