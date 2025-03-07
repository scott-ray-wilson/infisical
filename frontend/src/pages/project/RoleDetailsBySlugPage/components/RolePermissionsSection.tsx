import { useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { MongoAbility, MongoQuery, RawRuleOf } from "@casl/ability";
import {
  faArrowUpRightFromSquare,
  faDownLeftAndUpRightToCenter,
  faPlus,
  faSave,
  faUpRightAndDownLeftFromCenter,
  faWindowRestore
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccessTree } from "src/components/permissions";
import { twMerge } from "tailwind-merge";

import { createNotification } from "@app/components/notifications";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton
} from "@app/components/v2";
import { ProjectPermissionSub, useWorkspace } from "@app/context";
import { ProjectPermissionSet } from "@app/context/ProjectPermissionContext";
import { evaluatePermissionsAbility } from "@app/helpers/permissions";
import { useGetProjectRoleBySlug, useUpdateProjectRole } from "@app/hooks/api";

import { GeneralPermissionConditions } from "./GeneralPermissionConditions";
import { GeneralPermissionPolicies } from "./GeneralPermissionPolicies";
import { IdentityManagementPermissionConditions } from "./IdentityManagementPermissionConditions";
import { PermissionEmptyState } from "./PermissionEmptyState";
import {
  formRolePermission2API,
  isConditionalSubjects,
  PROJECT_PERMISSION_OBJECT,
  projectRoleFormSchema,
  rolePermission2Form,
  TFormSchema
} from "./ProjectRoleModifySection.utils";
import { SecretPermissionConditions } from "./SecretPermissionConditions";

type Props = {
  roleSlug: string;
  isDisabled?: boolean;
};

export const renderConditionalComponents = (
  subject: ProjectPermissionSub,
  isDisabled?: boolean
) => {
  if (subject === ProjectPermissionSub.Secrets)
    return <SecretPermissionConditions isDisabled={isDisabled} />;

  if (isConditionalSubjects(subject)) {
    if (subject === ProjectPermissionSub.Identity) {
      return <IdentityManagementPermissionConditions isDisabled={isDisabled} />;
    }

    return <GeneralPermissionConditions isDisabled={isDisabled} type={subject} />;
  }

  return undefined;
};

export const RolePermissionsSection = ({ roleSlug, isDisabled }: Props) => {
  const { currentWorkspace } = useWorkspace();
  const projectId = currentWorkspace?.id || "";
  const { data: role, isPending } = useGetProjectRoleBySlug(
    currentWorkspace?.id ?? "",
    roleSlug as string
  );

  const form = useForm<TFormSchema>({
    values: role ? { ...role, permissions: rolePermission2Form(role.permissions) } : undefined,
    resolver: zodResolver(projectRoleFormSchema)
  });

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
    reset
  } = form;

  const { mutateAsync: updateRole } = useUpdateProjectRole();

  const onSubmit = async (el: TFormSchema) => {
    try {
      if (!projectId || !role?.id) return;
      await updateRole({
        id: role?.id as string,
        projectId,
        ...el,
        permissions: formRolePermission2API(el.permissions)
      });
      createNotification({ type: "success", text: "Successfully updated role" });
    } catch (err) {
      console.log(err);
      createNotification({ type: "error", text: "Failed to update role" });
    }
  };

  const isCustomRole = !["admin", "member", "viewer", "no-access"].includes(role?.slug ?? "");

  const onNewPolicy = (selectedSubject: ProjectPermissionSub) => {
    const rootPolicyValue = form.getValues(`permissions.${selectedSubject}`);
    if (rootPolicyValue && isConditionalSubjects(selectedSubject)) {
      form.setValue(
        `permissions.${selectedSubject}`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error akhilmhdh: this is because of ts collision with both
        [...rootPolicyValue, {}],
        { shouldDirty: true, shouldTouch: true }
      );
    } else {
      form.setValue(
        `permissions.${selectedSubject}`,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-error akhilmhdh: this is because of ts collision with both
        [{}],
        {
          shouldDirty: true,
          shouldTouch: true
        }
      );
    }
  };

  const permissions = form.watch("permissions");

  const formattedPermissions = useMemo(
    () =>
      evaluatePermissionsAbility(
        formRolePermission2API(permissions) as RawRuleOf<
          MongoAbility<ProjectPermissionSet, MongoQuery>
        >[]
      ),
    [JSON.stringify(permissions)]
  );

  const [viewMode, setViewMode] = useState<"inline" | "anchored" | "modal">("inline");

  return (
    <div className="w-full">
      <div
        className={twMerge(
          "w-full",
          viewMode === "modal"
            ? "fixed inset-0 z-50 p-10"
            : viewMode === "anchored"
              ? "fixed bottom-4 left-20 z-50 h-[40%] w-[38%] min-w-[32rem] lg:w-[34%]"
              : ""
        )}
      >
        <div
          className={`mb-4 h-full w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 ${viewMode === "anchored" ? "relative p-0" : "flex flex-col p-4"} transition-transform duration-500`}
        >
          {viewMode !== "anchored" ? (
            <div className="mb-4 flex items-start justify-between border-b border-mineshaft-400 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-mineshaft-100">Access Tree</h3>
                <p className="text-sm leading-3 text-mineshaft-400">
                  Visual access policies for the configured role.
                </p>
              </div>
              <div className="mr-4 mt-3 flex items-center gap-1">
                <IconButton
                  colorSchema="secondary"
                  variant="plain"
                  onClick={() => setViewMode((prev) => (prev === "inline" ? "anchored" : "inline"))}
                  ariaLabel="Anchor access tree"
                  className=""
                >
                  <FontAwesomeIcon
                    icon={viewMode === "anchored" ? faArrowUpRightFromSquare : faWindowRestore}
                  />
                </IconButton>
                <IconButton
                  colorSchema="secondary"
                  variant="plain"
                  onClick={() => setViewMode((prev) => (prev === "inline" ? "modal" : "inline"))}
                  ariaLabel="Expand access tree"
                >
                  <FontAwesomeIcon
                    icon={
                      viewMode === "modal"
                        ? faDownLeftAndUpRightToCenter
                        : faUpRightAndDownLeftFromCenter
                    }
                  />
                </IconButton>
              </div>
            </div>
          ) : (
            <div className="absolute right-2 top-2 z-50">
              <IconButton
                colorSchema="secondary"
                variant="plain"
                onClick={() => setViewMode((prev) => (prev === "inline" ? "anchored" : "inline"))}
                ariaLabel="Anchor access tree"
                className=""
              >
                <FontAwesomeIcon
                  icon={viewMode === "anchored" ? faArrowUpRightFromSquare : faWindowRestore}
                />
              </IconButton>
              <IconButton
                colorSchema="secondary"
                variant="plain"
                onClick={() => setViewMode((prev) => (prev === "inline" ? "modal" : "inline"))}
                ariaLabel="Expand access tree"
              >
                <FontAwesomeIcon
                  icon={
                    viewMode === "modal"
                      ? faDownLeftAndUpRightToCenter
                      : faUpRightAndDownLeftFromCenter
                  }
                />
              </IconButton>
            </div>
          )}
          <div
            className={`flex ${viewMode === "inline" ? "h-96" : viewMode === "anchored" ? "h-full" : "flex-1"} items-center space-x-4`}
          >
            <AccessTree permissions={formattedPermissions} />
          </div>
        </div>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full rounded-lg border border-mineshaft-600 bg-mineshaft-900 p-4"
      >
        <FormProvider {...form}>
          <div className="flex items-center justify-between border-b border-mineshaft-400 pb-4">
            <h3 className="text-lg font-semibold text-mineshaft-100">Policies</h3>
            <div className="flex items-center space-x-4">
              {isCustomRole && (
                <>
                  {isDirty && (
                    <Button
                      className="mr-4 text-mineshaft-300"
                      variant="link"
                      isDisabled={isSubmitting}
                      isLoading={isSubmitting}
                      onClick={() => reset()}
                    >
                      Discard
                    </Button>
                  )}
                  <div className="flex items-center">
                    <Button
                      variant="outline_bg"
                      type="submit"
                      className={twMerge("h-10 rounded-r-none", isDirty && "bg-primary text-black")}
                      isDisabled={isSubmitting || !isDirty}
                      isLoading={isSubmitting}
                      leftIcon={<FontAwesomeIcon icon={faSave} />}
                    >
                      Save
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          isDisabled={isDisabled}
                          className="h-10 rounded-l-none"
                          variant="outline_bg"
                          leftIcon={<FontAwesomeIcon icon={faPlus} />}
                        >
                          New policy
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="thin-scrollbar max-h-96" align="end">
                        {Object.keys(PROJECT_PERMISSION_OBJECT)
                          .sort((a, b) =>
                            PROJECT_PERMISSION_OBJECT[
                              a as keyof typeof PROJECT_PERMISSION_OBJECT
                            ].title
                              .toLowerCase()
                              .localeCompare(
                                PROJECT_PERMISSION_OBJECT[
                                  b as keyof typeof PROJECT_PERMISSION_OBJECT
                                ].title.toLowerCase()
                              )
                          )
                          .map((subject) => (
                            <DropdownMenuItem
                              key={`permission-create-${subject}`}
                              className="py-3"
                              onClick={() => onNewPolicy(subject as ProjectPermissionSub)}
                            >
                              {PROJECT_PERMISSION_OBJECT[subject as ProjectPermissionSub].title}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="py-4">
            {!isPending && <PermissionEmptyState />}
            {(Object.keys(PROJECT_PERMISSION_OBJECT) as ProjectPermissionSub[]).map((subject) => (
              <GeneralPermissionPolicies
                subject={subject}
                actions={PROJECT_PERMISSION_OBJECT[subject].actions}
                title={PROJECT_PERMISSION_OBJECT[subject].title}
                key={`project-permission-${subject}`}
                isDisabled={isDisabled}
              >
                {renderConditionalComponents(subject, isDisabled)}
              </GeneralPermissionPolicies>
            ))}
          </div>
        </FormProvider>
      </form>
    </div>
  );
};
